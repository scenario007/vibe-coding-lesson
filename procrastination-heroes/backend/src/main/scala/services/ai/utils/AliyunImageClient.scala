package services.ai.utils

import cats.effect.IO
import io.circe.Json
import io.circe.parser.parse
import io.circe.syntax.*
import java.net.{URI, InetSocketAddress, ProxySelector}
import java.net.http.{HttpClient, HttpRequest, HttpResponse}
import java.nio.file.{Files, Path}
import java.time.Duration
import services.ai.objects.ImageAssetKind
import services.system.objects.AppError

private[ai] final class AliyunImageAuthError
    extends RuntimeException("阿里云图片 Key 认证失败（HTTP 401）。请检查百炼 API Key、所属地域和接入地址，并重新配置。")

/**
  * Server-side adapter for Aliyun Model Studio image generation.
  *
  * The API key is intentionally read only from the backend environment. The
  * returned Model Studio URL is temporary, so a successful response is copied
  * into the local frontend public directory before it is exposed to React.
  */
private[ai] object AliyunImageClient:
  private val model = sys.env.getOrElse("ALIYUN_IMAGE_MODEL", "wan2.7-image")
  private val base = sys.env
    .getOrElse("ALIYUN_DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/api/v1")
    .stripSuffix("/")
  private val size = sys.env.getOrElse("ALIYUN_IMAGE_SIZE", "1K")
  private val assetRoot = Path.of(sys.env.getOrElse("ALIYUN_IMAGE_ASSET_DIR", "../frontend/public/generated"))
  private val style =
    "公会手账＋废柴勇者原创游戏素材，羊皮纸底色，炭黑手绘线稿，暗红印章，橄榄绿、暖金、砖红和旧木色配色，轻微不对称的手工纸张质感，轮廓清楚，细节温暖幽默，二维插画，不要照片写实，不要 3D 渲染。"

  private def key: Option[String] =
    sys.env
      .get("ALIYUN_DASHSCOPE_API_KEY")
      .orElse(sys.env.get("DASHSCOPE_API_KEY"))
      .map(_.trim)
      .filter(_.nonEmpty)

  private def enabled: Boolean =
    key.nonEmpty && sys.env.get("ALIYUN_IMAGE_GENERATION_ENABLED").forall(!_.equalsIgnoreCase("false"))

  private def required: Boolean =
    sys.env.get("ALIYUN_IMAGE_GENERATION_REQUIRED").exists(_.equalsIgnoreCase("true"))

  private def makeClient(redirects: HttpClient.Redirect): HttpClient =
    val builder = HttpClient
      .newBuilder()
      .connectTimeout(Duration.ofSeconds(15))
      .followRedirects(redirects)
    sys.env.get("HTTPS_PROXY").orElse(sys.env.get("https_proxy")).foreach { value =>
      val proxy = URI.create(value)
      if proxy.getHost != null then
        builder.proxy(ProxySelector.of(InetSocketAddress(proxy.getHost, if proxy.getPort > 0 then proxy.getPort else 80)))
    }
    builder.build()

  private lazy val apiClient = makeClient(HttpClient.Redirect.NEVER)
  private lazy val downloadClient = makeClient(HttpClient.Redirect.NORMAL)

  private def prompt(kind: ImageAssetKind, description: String): String =
    val subject = kind match
      case ImageAssetKind.reward =>
        "一件单独展示的任务专属战利品，主体居中，完整轮廓，像一件可以钉在公会奖品展板上的收藏品"
      case ImageAssetKind.furniture =>
        "一件单独展示的据点家具素材，主体居中，完整轮廓，方便放入自由画布；摆放位置只由应用记录，不改变家具外形"
    val dimensions = if size.equalsIgnoreCase("2K") then "约 2048×2048 像素" else "约 1024×1024 像素"
    s"$style $subject。$description 画面为 1:1 正方形，$dimensions，四周留出适度留白。禁止任何文字、字母、logo、水印、边框、拼贴、多主体和场景截图。"

  private def payload(kind: ImageAssetKind, description: String): String =
    Json
      .obj(
        "model" -> model.asJson,
        "input" -> Json.obj(
          "messages" -> Json.arr(
            Json.obj(
              "role" -> "user".asJson,
              "content" -> Json.arr(Json.obj("text" -> prompt(kind, description).asJson))
            )
          )
        ),
        "parameters" -> Json.obj("size" -> size.asJson, "n" -> 1.asJson, "watermark" -> false.asJson)
      )
      .noSpaces

  private def imageUrl(json: Json): Option[String] =
    json.hcursor.downField("output").downField("choices").focus.flatMap(_.asArray).toList.flatten
      .flatMap(choice => choice.hcursor.downField("message").downField("content").focus.flatMap(_.asArray).toList.flatten)
      .flatMap(content => content.hcursor.get[String]("image").toOption)
      .find(_.startsWith("http"))

  private def copyResult(kind: ImageAssetKind, assetId: String, url: String): IO[String] =
    IO.blocking {
      val target = assetRoot.resolve(kind.toString).resolve(assetId + ".png")
      Files.createDirectories(target.getParent)
      val request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(60)).GET().build()
      val response = downloadClient.send(request, HttpResponse.BodyHandlers.ofByteArray())
      if response.statusCode() != 200 then throw AppError(502, "阿里云图片结果下载失败，已回退到公会手绘素材")
      Files.write(target, response.body())
      "/generated/" + kind.toString + "/" + assetId + ".png"
    }

  private def request(kind: ImageAssetKind, description: String, assetId: String, apiKey: String): IO[String] =
    IO.blocking {
      val request = HttpRequest
        .newBuilder(URI.create(base + "/services/aigc/multimodal-generation/generation"))
        .timeout(Duration.ofSeconds(95))
        .header("Authorization", "Bearer " + apiKey)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(payload(kind, description)))
        .build()
      apiClient.send(request, HttpResponse.BodyHandlers.ofString())
    }.flatMap { response =>
      if response.statusCode() == 401 then IO.raiseError(AliyunImageAuthError())
      else parse(response.body()).flatMap(json =>
        if response.statusCode() == 200 then imageUrl(json).toRight(AppError(502, "阿里云图片响应中没有图片地址"))
        else Left(AppError(502, s"阿里云图片生成失败（HTTP ${response.statusCode()}）"))
      ) match
        case Left(error: AppError) => IO.raiseError(error)
        case Left(_) => IO.raiseError(AppError(502, "阿里云图片响应无法解析"))
        case Right(url) => copyResult(kind, assetId, url)
    }

  def generate(kind: ImageAssetKind, description: String, assetId: String): IO[Option[String]] =
    if !enabled then IO.pure(None)
    else
      key match
        case None => IO.pure(None)
        case Some(apiKey) =>
          request(kind, description, assetId, apiKey).map(Some(_)).handleErrorWith { error =>
            if required || error.isInstanceOf[AliyunImageAuthError] then IO.raiseError(error)
            else IO.println("阿里云图片生成未完成，继续使用公会手绘素材。原因：" + error.getMessage).as(None)
          }

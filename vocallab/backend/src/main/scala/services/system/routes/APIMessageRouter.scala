package services.system.routes

import cats.effect.IO
import io.circe.{Decoder, Encoder, Json}
import org.http4s.*
import org.http4s.circe.*
import org.http4s.dsl.io.*
import org.typelevel.ci.CIString
import services.system.api.{APIMessage, Database}
import services.system.objects.{ApiError, AppConfig}
import java.util.Locale
import scala.reflect.ClassTag

object APIMessageRouter:
  def name[M: ClassTag]: String =
    summon[ClassTag[M]].runtimeClass.getSimpleName.stripSuffix("Message").toLowerCase(Locale.ROOT)

  def json[M <: APIMessage[A]: ClassTag, I: Decoder, A: Encoder](
      database: Database, message: I => M
  ): HttpRoutes[IO] = HttpRoutes.of[IO] {
    case request @ POST -> Root / "api" / operation if operation == name[M] =>
      request.body.take(32769).compile.toVector.flatMap { bytes =>
        if bytes.size > 32768 then IO.raiseError(ApiError(Status.PayloadTooLarge, "请求数据过大。"))
        else
          val raw = new String(bytes.toArray, java.nio.charset.StandardCharsets.UTF_8)
          IO.fromEither(io.circe.parser.decode[I](raw).left.map(_ => ApiError(Status.BadRequest, "请求参数无效。")))
            .flatMap(input => database.use(message(input).plan))
            .flatMap(result => Ok(Encoder[A].apply(result)))
      }
  }

  def local(app: HttpApp[IO], config: AppConfig): HttpApp[IO] = HttpApp[IO] { request =>
    val servers = Set(config.port, config.frontendPort).flatMap(port =>
      Set(s"127.0.0.1:$port", s"localhost:$port"))
    val host = request.headers.get(CIString("Host")).map(_.head.value.toLowerCase(Locale.ROOT))
    val origin = request.headers.get(CIString("Origin")).map(_.head.value)
    val marker = request.headers.get(CIString("X-VocalLab")).exists(_.head.value == "1")
    val valid = host.exists(servers.contains) && origin.forall(value => servers.exists(server => value == s"http://$server")) &&
      (request.method != Method.POST || marker)
    if !valid then Forbidden(Json.obj("error" -> Json.fromString("VocalLab 仅接受本机页面发出的请求。")))
    else
      app(request).handleErrorWith {
        case ApiError(status, message) => IO.pure(Response[IO](status).withEntity(Json.obj("error" -> Json.fromString(message))))
        case error => IO.delay(error.printStackTrace()) *> InternalServerError(Json.obj("error" -> Json.fromString("服务器处理失败，请查看本地日志。")))
      }.map(_.putHeaders(Header.Raw(CIString("Cache-Control"), "no-store"),
        Header.Raw(CIString("X-Content-Type-Options"), "nosniff"),
        Header.Raw(CIString("Cross-Origin-Resource-Policy"), "same-origin")))
  }

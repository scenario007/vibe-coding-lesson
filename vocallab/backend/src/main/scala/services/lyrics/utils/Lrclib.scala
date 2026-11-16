package services.lyrics.utils

import cats.effect.{IO, Resource}
import cats.syntax.monadError.*
import io.circe.Decoder
import java.net.{URI, URLEncoder}
import java.net.http.{HttpClient, HttpRequest, HttpResponse}
import java.nio.charset.StandardCharsets.UTF_8
import java.time.Duration
import org.http4s.Status
import scala.concurrent.duration.*
import services.lyrics.objects.LyricsTrack
import services.lyrics.objects.apiTypes.GetLyricsResponse
import services.system.objects.ApiError

private[lyrics] object Lrclib:
  private val host = "https://lrclib.net"
  private val limit = 262144
  private lazy val client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build()

  private def unavailable: ApiError =
    ApiError(Status.BadGateway, "暂时无法连接 LRCLIB，请稍后再试。")

  private def get[A: Decoder](path: String): IO[A] =
    val request = HttpRequest.newBuilder(URI.create(host + path))
      .header("Accept", "application/json")
      .header("User-Agent", "VocalLab/1.1 (local synced lyrics viewer)")
      .timeout(Duration.ofSeconds(8)).GET().build()

    Resource.make(IO.fromCompletableFuture(IO.delay(client.sendAsync(request, HttpResponse.BodyHandlers.ofInputStream()))))(
      response => IO.blocking(response.body().close())).use { response =>
        response.statusCode() match
          case 200 =>
            for
              bytes <- IO.interruptibleMany(response.body().readNBytes(limit + 1))
              _ <- IO.raiseWhen(bytes.length > limit)(unavailable)
              data <- IO.fromEither(io.circe.parser.decode[A](new String(bytes, UTF_8)).left.map(_ => unavailable))
            yield data
          case 404 => IO.raiseError(ApiError(Status.NotFound, "歌词记录已不可用，请重新搜索。"))
          case 429 => IO.raiseError(ApiError(Status.TooManyRequests, "歌词库请求过多，请稍候再试。"))
          case _ => IO.raiseError(unavailable)
      }.timeout(9.seconds).adaptError {
        case error if !error.isInstanceOf[ApiError] => unavailable
      }

  private[lyrics] def search(title: String, artist: String): IO[Vector[LyricsTrack]] =
    val fields = Vector("track_name" -> title, "artist_name" -> artist).filter(_._2.nonEmpty)
    val query = fields.map((key, value) => s"$key=${URLEncoder.encode(value, UTF_8)}").mkString("&")
    get[Vector[LyricsTrack]](s"/api/v2/search?$query").map(_.take(20))

  private[lyrics] def lyrics(id: Long): IO[GetLyricsResponse] =
    get[GetLyricsResponse](s"/api/get/$id")
      .flatMap(data => IO.raiseUnless(data.id == id)(unavailable).as(data))

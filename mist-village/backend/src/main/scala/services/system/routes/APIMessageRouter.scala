package services.system.routes
import cats.effect.IO
import org.http4s.{HttpRoutes,Response,Status}
import org.http4s.dsl.io.*
import org.http4s.circe.CirceEntityEncoder.*
import io.circe.{Json,parser}
import io.circe.syntax.*
import java.nio.charset.StandardCharsets
import org.typelevel.ci.CIString
import services.system.api.{DatabaseSession,RegisteredAPIMessage}
import services.system.objects.AppError
object APIMessageRouter:
  def routes(messages: List[RegisteredAPIMessage]): HttpRoutes[IO] =
    val registry = messages.map(m => m.name -> m).toMap
    HttpRoutes.of[IO] {
      case GET -> Root / "api" / "health" => Ok(Json.obj("status" -> "ok".asJson))
      case req @ POST -> Root / "api" / name =>
        val task = for
          origin <- IO.pure(req.headers.get(CIString("Origin")).map(_.head.value))
          allowedOrigin = sys.env.get("MIST_ALLOWED_ORIGIN")
          _ <- if origin.isEmpty || origin == allowedOrigin then IO.unit else IO.raiseError(AppError(403,"来源不被允许"))
          _ <- if req.contentType.exists(_.mediaType == org.http4s.MediaType.application.json) then IO.unit else IO.raiseError(AppError(415,"需要 application/json"))
          api <- IO.fromOption(registry.get(name.toLowerCase))(AppError(404,"接口不存在"))
          bytes <- req.body.take(65537).compile.to(Array)
          _ <- if bytes.length <= 65536 then IO.unit else IO.raiseError(AppError(413,"请求过大"))
          json <- IO.fromEither(parser.parse(String(bytes,StandardCharsets.UTF_8)).left.map(_ => AppError(400,"请求必须是 JSON")))
          result <- DatabaseSession.transaction(c => api.run(json,c))
          response <- Ok(result)
        yield response
        task.handleErrorWith { e =>
          val (status,message) = e match
            case a: AppError => (a.status,a.message)
            case _ => (500,"操作失败，事务已回滚")
          IO.pure(Response[IO](Status.fromInt(status).getOrElse(Status.InternalServerError)).withEntity(Json.obj("message" -> message.asJson)))
        }
    }

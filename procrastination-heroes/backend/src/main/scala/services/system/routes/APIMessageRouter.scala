package services.system.routes
import services.system.objects.AppError
import cats.effect.IO
import cats.syntax.all.*
import org.http4s.{HttpRoutes, Response, Status}
import org.http4s.dsl.io.*
import org.http4s.circe.CirceEntityEncoder.*
import io.circe.{Json, parser}
import io.circe.syntax.*
import java.nio.charset.StandardCharsets
import services.system.api.RegisteredAPIMessage
import services.system.api.DatabaseSession
import services.users.api.ResolveUserTokenAPIMessage
object APIMessageRouter:
  def routes(messages: List[RegisteredAPIMessage]): HttpRoutes[IO] =
    val registry = messages.map(m=>m.name->m).toMap
    HttpRoutes.of[IO] {
      case GET -> Root / "api" / "health" => Ok(Json.obj("status"->"ok".asJson,"service"->"procrastination-heroes".asJson))
      case req @ POST -> Root / "api" / name =>
        val action = for
          registered <- IO.fromOption(registry.get(name.toLowerCase))(AppError(404,"接口不存在"))
          bytes <- req.body.take(65537).compile.to(Array)
          _ <- if bytes.length<=65536 then IO.unit else IO.raiseError(AppError(413,"请求内容过长"))
          json <- IO.fromEither(parser.parse(String(bytes,StandardCharsets.UTF_8)).left.map(_=>AppError(400,"请求必须是 JSON")))
          result <- DatabaseSession.transaction { c =>
            (if registered.authenticated then
              for
                token <- IO.fromEither(json.hcursor.get[String]("userToken").left.map(_=>AppError(401,"请先登录")))
                userId <- ResolveUserTokenAPIMessage(token).plan(c)
                body <- IO.fromOption(json.asObject)(AppError(400,"请求必须是对象"))
              yield Json.fromJsonObject(body.remove("userToken").add("userId",userId.asJson))
            else IO.pure(json)).flatMap(registered.run(_,c))
          }
          response <- Ok(result)
        yield response
        action.handleErrorWith { error =>
          val (status,message) = error match
            case e: AppError => (e.status,e.message)
            case e: org.postgresql.util.PSQLException if e.getSQLState=="23505" => (409,"数据已存在，请刷新后重试")
            case _ => (500,"操作暂未完成，数据已回滚，请稍后重试")
          IO.pure(Response[IO](Status.fromInt(status).toOption.get).withEntity(Json.obj("message"->message.asJson)))
        }
    }

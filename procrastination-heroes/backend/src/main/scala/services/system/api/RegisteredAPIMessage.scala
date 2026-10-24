package services.system.api
import services.system.objects.AppError
import cats.effect.IO
import io.circe.{Decoder, Encoder, Json}
import io.circe.syntax.*
import scala.reflect.ClassTag
import java.sql.Connection
final case class RegisteredAPIMessage(name: String, authenticated: Boolean, run: (Json,Connection) => IO[Json])
object RegisteredAPIMessage:
  def register[M <: APIMessage[R],R](authenticated: Boolean)(using d: Decoder[M],e: Encoder[R],tag: ClassTag[M]): RegisteredAPIMessage =
    RegisteredAPIMessage(tag.runtimeClass.getSimpleName.stripSuffix("Message").toLowerCase, authenticated,
      (body,connection) => IO.fromEither(d.decodeJson(body).left.map(_ => AppError(400,"请求字段不完整或格式错误"))).flatMap(_.plan(connection)).map(_.asJson))

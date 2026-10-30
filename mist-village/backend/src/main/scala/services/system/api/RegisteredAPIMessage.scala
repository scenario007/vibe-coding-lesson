package services.system.api
import cats.effect.IO
import io.circe.{Decoder,Encoder,Json}
import io.circe.syntax.*
import java.sql.Connection
import scala.reflect.ClassTag
import services.system.objects.AppError
final case class RegisteredAPIMessage(name: String, run: (Json,Connection) => IO[Json])
object RegisteredAPIMessage:
  def register[M <: APIMessage[R], R](using d: Decoder[M], e: Encoder[R], t: ClassTag[M]): RegisteredAPIMessage =
    RegisteredAPIMessage(t.runtimeClass.getSimpleName.stripSuffix("Message").toLowerCase, (json,c) =>
      IO.fromEither(d.decodeJson(json).left.map(_ => AppError(400,"请求格式不正确"))).flatMap(_.plan(c)).map(_.asJson))

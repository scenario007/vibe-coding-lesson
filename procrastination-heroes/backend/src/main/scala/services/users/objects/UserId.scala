package services.users.objects
import io.circe.{Encoder, Decoder}
import java.util.UUID
import scala.util.Try
final case class UserId(value: String)
object UserId:
  given Encoder[UserId] = Encoder.encodeString.contramap(_.value)
  given Decoder[UserId] = Decoder.decodeString.emap(v => Try(UUID.fromString(v)).toEither.left.map(_ => "无效的标识").map(x => UserId(x.toString)))

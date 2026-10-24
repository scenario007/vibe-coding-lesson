package services.focus.objects
import io.circe.{Encoder, Decoder}
import java.util.UUID
import scala.util.Try
final case class FocusId(value: String)
object FocusId:
  given Encoder[FocusId] = Encoder.encodeString.contramap(_.value)
  given Decoder[FocusId] = Decoder.decodeString.emap(v => Try(UUID.fromString(v)).toEither.left.map(_ => "无效的标识").map(x => FocusId(x.toString)))

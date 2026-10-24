package services.ai.objects
import io.circe.{Encoder, Decoder}
import java.util.UUID
import scala.util.Try
final case class JobId(value: String)
object JobId:
  given Encoder[JobId] = Encoder.encodeString.contramap(_.value)
  given Decoder[JobId] = Decoder.decodeString.emap(v => Try(UUID.fromString(v)).toEither.left.map(_ => "无效的标识").map(x => JobId(x.toString)))

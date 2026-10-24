package services.quests.objects
import io.circe.{Encoder, Decoder}
import java.util.UUID
import scala.util.Try
final case class StepId(value: String)
object StepId:
  given Encoder[StepId] = Encoder.encodeString.contramap(_.value)
  given Decoder[StepId] = Decoder.decodeString.emap(v => Try(UUID.fromString(v)).toEither.left.map(_ => "无效的标识").map(x => StepId(x.toString)))

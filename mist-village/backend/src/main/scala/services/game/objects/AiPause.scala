package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class AiPause(kind: String, input: String, message: String)
object AiPause:
  given Encoder[AiPause] = deriveEncoder
  given Decoder[AiPause] = deriveDecoder

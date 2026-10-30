package services.ai.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class Hint(text: String)
object Hint:
  given Encoder[Hint] = deriveEncoder
  given Decoder[Hint] = deriveDecoder

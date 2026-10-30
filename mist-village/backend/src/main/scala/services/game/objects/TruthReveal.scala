package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class TruthReveal(title: String, explanation: String)
object TruthReveal:
  given Encoder[TruthReveal] = deriveEncoder
  given Decoder[TruthReveal] = deriveDecoder

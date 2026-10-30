package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class SaveSummary(slot: Int, savedAt: String, hour: Int, place: String, stage: Int)
object SaveSummary:
  given Encoder[SaveSummary] = deriveEncoder
  given Decoder[SaveSummary] = deriveDecoder

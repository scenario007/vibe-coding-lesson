package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class OutcomeRecord(id: String, characterName: String, kind: String, hour: Int, summary: String, recordedAt: String)
object OutcomeRecord:
  given Encoder[OutcomeRecord] = deriveEncoder
  given Decoder[OutcomeRecord] = deriveDecoder

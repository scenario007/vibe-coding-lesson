package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class ChallengeTruth(incident: String, involvedNpc: String, knowledge: String, motive: String)
object ChallengeTruth:
  given Encoder[ChallengeTruth] = deriveEncoder
  given Decoder[ChallengeTruth] = deriveDecoder

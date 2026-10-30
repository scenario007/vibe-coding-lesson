package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class ActionOption(id: String, label: String, hours: Int, knownRisk: Option[String])
object ActionOption:
  given Encoder[ActionOption] = deriveEncoder
  given Decoder[ActionOption] = deriveDecoder

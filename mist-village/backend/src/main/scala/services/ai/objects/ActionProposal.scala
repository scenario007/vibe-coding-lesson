package services.ai.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class ActionProposal(action: String, explanation: String)
object ActionProposal:
  given Encoder[ActionProposal] = deriveEncoder
  given Decoder[ActionProposal] = deriveDecoder

package services.ai.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class ProposalReply(status: String, message: Option[String], proposal: Option[ActionProposal])
object ProposalReply:
  given Encoder[ProposalReply] = deriveEncoder
  given Decoder[ProposalReply] = deriveDecoder

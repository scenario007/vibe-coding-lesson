package services.ai.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.game.objects.ResolutionPreview
final case class ResolutionReply(status: String, message: Option[String], preview: Option[ResolutionPreview])
object ResolutionReply:
  given Encoder[ResolutionReply] = deriveEncoder
  given Decoder[ResolutionReply] = deriveDecoder

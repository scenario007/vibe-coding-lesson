package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class ResolutionPreview(plan: ResolutionPlan, description: String, hours: Int, warning: Option[String])
object ResolutionPreview:
  given Encoder[ResolutionPreview] = deriveEncoder
  given Decoder[ResolutionPreview] = deriveDecoder

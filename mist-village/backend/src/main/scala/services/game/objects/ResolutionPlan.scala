package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class ResolutionPlan(method: String, support: String, person: Option[String])
object ResolutionPlan:
  given Encoder[ResolutionPlan] = deriveEncoder
  given Decoder[ResolutionPlan] = deriveDecoder

package services.ai.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class VisitorPlan(kind: String, contact: String)
object VisitorPlan:
  given Encoder[VisitorPlan] = deriveEncoder
  given Decoder[VisitorPlan] = deriveDecoder

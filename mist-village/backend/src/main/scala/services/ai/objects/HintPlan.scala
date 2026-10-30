package services.ai.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class HintPlan(indexes: List[Int], gap: String)
object HintPlan:
  given Encoder[HintPlan] = deriveEncoder
  given Decoder[HintPlan] = deriveDecoder

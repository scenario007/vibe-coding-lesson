package services.ai.objects
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
final case class DynamicQuestPlan(goal: String, issuer: String, reward: String, reasonIndex: Option[Int] = None)
object DynamicQuestPlan:
  given Encoder[DynamicQuestPlan] = deriveEncoder
  given Decoder[DynamicQuestPlan] = deriveDecoder

package services.economy.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import services.quests.objects.{QuestId, StepId}
final case class RewardEvent(id: String, questId: QuestId, stepId: StepId, coins: Int, experience: Int, createdAt: Long)
object RewardEvent:
  given Encoder[RewardEvent] = deriveEncoder[RewardEvent]
  given Decoder[RewardEvent] = deriveDecoder[RewardEvent]

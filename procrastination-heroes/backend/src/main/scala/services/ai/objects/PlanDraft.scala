package services.ai.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import services.quests.objects.{QuestCategory, StageDraft}
import services.economy.objects.RewardDraft
final case class PlanDraft(title: String, category: QuestCategory, summary: String, stages: List[StageDraft], reward: RewardDraft)
object PlanDraft:
  given Encoder[PlanDraft] = deriveEncoder[PlanDraft]
  given Decoder[PlanDraft] = deriveDecoder[PlanDraft]

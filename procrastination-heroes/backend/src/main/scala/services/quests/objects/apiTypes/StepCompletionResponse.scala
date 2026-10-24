package services.quests.objects.apiTypes
import services.quests.objects.*
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import services.economy.objects.PlayerProgress
final case class StepCompletionResponse(detail: QuestDetail, progress: PlayerProgress, awardedCoins: Int, alreadyCompleted: Boolean, rewardUnlocked: Boolean)
object StepCompletionResponse:
  given Encoder[StepCompletionResponse] = deriveEncoder[StepCompletionResponse]
  given Decoder[StepCompletionResponse] = deriveDecoder[StepCompletionResponse]

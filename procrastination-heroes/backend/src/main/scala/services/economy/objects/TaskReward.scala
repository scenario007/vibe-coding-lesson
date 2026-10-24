package services.economy.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import services.quests.objects.QuestId
final case class TaskReward(id: String, questId: QuestId, design: RewardDesign, unlockedAt: Long)
object TaskReward:
  given Encoder[TaskReward] = deriveEncoder[TaskReward]
  given Decoder[TaskReward] = deriveDecoder[TaskReward]

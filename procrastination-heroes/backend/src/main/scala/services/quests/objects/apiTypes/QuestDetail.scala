package services.quests.objects.apiTypes
import services.quests.objects.*
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import services.economy.objects.RewardDesign
final case class QuestDetail(quest: QuestRecord, steps: List[QuestStep], reward: RewardDesign)
object QuestDetail:
  given Encoder[QuestDetail] = deriveEncoder[QuestDetail]
  given Decoder[QuestDetail] = deriveDecoder[QuestDetail]

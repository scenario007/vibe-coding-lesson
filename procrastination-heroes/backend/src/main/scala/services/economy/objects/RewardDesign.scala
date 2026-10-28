package services.economy.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import services.quests.objects.QuestId
final case class RewardDesign(
    id: String,
    questId: QuestId,
    name: String,
    story: String,
    symbol: RewardSymbol,
    palette: RewardPalette,
    imageUrl: Option[String] = None
)
object RewardDesign:
  given Encoder[RewardDesign] = deriveEncoder[RewardDesign]
  given Decoder[RewardDesign] = deriveDecoder[RewardDesign]

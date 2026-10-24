package services.economy.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class RewardDraft(name: String, story: String, symbol: RewardSymbol, palette: RewardPalette)
object RewardDraft:
  given Encoder[RewardDraft] = deriveEncoder[RewardDraft]
  given Decoder[RewardDraft] = deriveDecoder[RewardDraft]

package services.economy.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class StoreItem(
    id: String,
    name: String,
    description: String,
    price: Int,
    slot: RoomSlot,
    symbol: RewardSymbol,
    palette: RewardPalette,
    imageUrl: Option[String] = None
)
object StoreItem:
  given Encoder[StoreItem] = deriveEncoder[StoreItem]
  given Decoder[StoreItem] = deriveDecoder[StoreItem]

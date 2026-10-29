package services.economy.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class OwnedItem(id: String, itemId: String, purchasedAt: Long)
object OwnedItem:
  given Encoder[OwnedItem] = deriveEncoder[OwnedItem]
  given Decoder[OwnedItem] = deriveDecoder[OwnedItem]

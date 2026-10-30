package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class ShopItem(id: String, price: Int, available: Int)
object ShopItem:
  given Encoder[ShopItem] = deriveEncoder
  given Decoder[ShopItem] = deriveDecoder

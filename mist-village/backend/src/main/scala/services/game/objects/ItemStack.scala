package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class ItemStack(id: String, quantity: Int)
object ItemStack:
  given Encoder[ItemStack] = deriveEncoder
  given Decoder[ItemStack] = deriveDecoder
  val initial: List[ItemStack] = List(ItemStack("medicine",1),ItemStack("food",2),ItemStack("oil",1))

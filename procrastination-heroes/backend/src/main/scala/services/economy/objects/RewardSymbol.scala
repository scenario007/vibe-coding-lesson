package services.economy.objects
import io.circe.{Encoder, Decoder}
enum RewardSymbol:
  case lamp, leaf, star, book, camera, mountain, moon, flower, cloud, sword, shield, scroll, dumbbell, microscope
object RewardSymbol:
  def toString(value: RewardSymbol): String = value.toString
  def fromString(value: String): Either[String,RewardSymbol] = RewardSymbol.values.find(_.toString==value.trim.toLowerCase).toRight("不支持的 RewardSymbol")
  given Encoder[RewardSymbol] = Encoder.encodeString.contramap(toString)
  given Decoder[RewardSymbol] = Decoder.decodeString.emap(fromString)

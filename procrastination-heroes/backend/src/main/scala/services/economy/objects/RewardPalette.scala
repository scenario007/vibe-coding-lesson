package services.economy.objects
import io.circe.{Encoder, Decoder}
enum RewardPalette:
  case sage, gold, lavender, rose, sky
object RewardPalette:
  def toString(value: RewardPalette): String = value.toString
  def fromString(value: String): Either[String,RewardPalette] = RewardPalette.values.find(_.toString==value.trim.toLowerCase).toRight("不支持的 RewardPalette")
  given Encoder[RewardPalette] = Encoder.encodeString.contramap(toString)
  given Decoder[RewardPalette] = Decoder.decodeString.emap(fromString)

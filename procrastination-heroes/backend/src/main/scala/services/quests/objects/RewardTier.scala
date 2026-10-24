package services.quests.objects
import io.circe.{Encoder, Decoder}
enum RewardTier:
  case small, normal, main
object RewardTier:
  def fromString(value: String): Either[String,RewardTier] = RewardTier.values.find(_.toString == value.trim.toLowerCase).toRight("无效的 RewardTier")
  def toString(value: RewardTier): String = value.toString
  given Encoder[RewardTier] = Encoder.encodeString.contramap(toString)
  given Decoder[RewardTier] = Decoder.decodeString.emap(fromString)

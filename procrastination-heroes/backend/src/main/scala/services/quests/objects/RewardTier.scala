package services.quests.objects
import io.circe.{Encoder, Decoder}
enum RewardTier:
  case daily, challenge, longTerm
object RewardTier:
  def fromString(value: String): Either[String,RewardTier] = value.trim.toLowerCase match
    case "daily" | "small" => Right(RewardTier.daily)
    case "challenge" | "normal" => Right(RewardTier.challenge)
    case "long_term" | "longterm" | "main" => Right(RewardTier.longTerm)
    case _ => Left("无效的 RewardTier")
  def toString(value: RewardTier): String = value match
    case RewardTier.daily => "daily"
    case RewardTier.challenge => "challenge"
    case RewardTier.longTerm => "long_term"
  given Encoder[RewardTier] = Encoder.encodeString.contramap(toString)
  given Decoder[RewardTier] = Decoder.decodeString.emap(fromString)

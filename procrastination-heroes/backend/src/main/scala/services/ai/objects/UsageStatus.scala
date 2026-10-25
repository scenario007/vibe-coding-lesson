package services.ai.objects
import io.circe.{Encoder,Decoder}
enum UsageStatus:
  case reserved, measured, unconfirmed
object UsageStatus:
  def toString(v: UsageStatus): String = v.toString
  def fromString(v: String): Either[String,UsageStatus] = UsageStatus.values.find(_.toString==v.trim.toLowerCase).toRight("未知费用状态")
  given Encoder[UsageStatus] = Encoder.encodeString.contramap(toString)
  given Decoder[UsageStatus] = Decoder.decodeString.emap(fromString)

package services.ai.objects
import io.circe.{Encoder,Decoder}
enum AssetStatus:
  case pending, succeeded, unconfirmed
object AssetStatus:
  def toString(v: AssetStatus): String = v.toString
  def fromString(v: String): Either[String,AssetStatus] = AssetStatus.values.find(_.toString==v.trim.toLowerCase).toRight("未知素材状态")
  given Encoder[AssetStatus] = Encoder.encodeString.contramap(toString)
  given Decoder[AssetStatus] = Decoder.decodeString.emap(fromString)

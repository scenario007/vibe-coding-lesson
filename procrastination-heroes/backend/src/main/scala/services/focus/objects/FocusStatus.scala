package services.focus.objects
import io.circe.{Encoder, Decoder}
enum FocusStatus:
  case running, paused, completed, abandoned
object FocusStatus:
  def fromString(value: String): Either[String,FocusStatus] = FocusStatus.values.find(_.toString == value.trim.toLowerCase).toRight("无效的 FocusStatus")
  def toString(value: FocusStatus): String = value.toString
  given Encoder[FocusStatus] = Encoder.encodeString.contramap(toString)
  given Decoder[FocusStatus] = Decoder.decodeString.emap(fromString)

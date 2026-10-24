package services.economy.objects
import io.circe.{Encoder, Decoder}
enum RoomSlot:
  case lighting, window, desk, floor, chair, wall
object RoomSlot:
  def toString(value: RoomSlot): String = value.toString
  def fromString(value: String): Either[String,RoomSlot] = RoomSlot.values.find(_.toString==value.trim.toLowerCase).toRight("不支持的 RoomSlot")
  given Encoder[RoomSlot] = Encoder.encodeString.contramap(toString)
  given Decoder[RoomSlot] = Decoder.decodeString.emap(fromString)

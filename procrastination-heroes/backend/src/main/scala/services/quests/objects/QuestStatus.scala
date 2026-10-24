package services.quests.objects
import io.circe.{Encoder, Decoder}
enum QuestStatus:
  case draft, active, completed, archived
object QuestStatus:
  def fromString(value: String): Either[String,QuestStatus] = QuestStatus.values.find(_.toString == value.trim.toLowerCase).toRight("无效的 QuestStatus")
  def toString(value: QuestStatus): String = value.toString
  given Encoder[QuestStatus] = Encoder.encodeString.contramap(toString)
  given Decoder[QuestStatus] = Decoder.decodeString.emap(fromString)

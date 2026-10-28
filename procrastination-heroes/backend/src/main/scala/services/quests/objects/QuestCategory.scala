package services.quests.objects
import io.circe.{Encoder, Decoder}
enum QuestCategory:
  case study, creative, health, life, research, other
object QuestCategory:
  def fromString(value: String): Either[String,QuestCategory] = QuestCategory.values.find(_.toString == value.trim.toLowerCase).toRight("无效的 QuestCategory")
  def toString(value: QuestCategory): String = value.toString
  given Encoder[QuestCategory] = Encoder.encodeString.contramap(toString)
  given Decoder[QuestCategory] = Decoder.decodeString.emap(fromString)

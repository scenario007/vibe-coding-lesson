package services.game.objects
import io.circe.{Decoder,Encoder}
enum QuestStatus:
  case offered, active, paused, completed, expired, abandoned
object QuestStatus:
  given Encoder[QuestStatus] = Encoder.encodeString.contramap(_.toString)
  given Decoder[QuestStatus] = Decoder.decodeString.emap(s => QuestStatus.values.find(_.toString == s).toRight("未知请求状态"))

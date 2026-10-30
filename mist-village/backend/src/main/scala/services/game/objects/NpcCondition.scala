package services.game.objects
import io.circe.{Decoder,Encoder}
enum NpcCondition:
  case healthy, injured, deceased
object NpcCondition:
  given Encoder[NpcCondition] = Encoder.encodeString.contramap(_.toString)
  given Decoder[NpcCondition] = Decoder.decodeString.emap(s=>NpcCondition.values.find(_.toString==s).toRight("未知人物状态"))

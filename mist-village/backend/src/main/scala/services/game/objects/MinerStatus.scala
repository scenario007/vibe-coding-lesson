package services.game.objects
import io.circe.{Decoder,Encoder}
enum MinerStatus:
  case missing, rescued, lost
object MinerStatus:
  given Encoder[MinerStatus] = Encoder.encodeString.contramap(_.toString)
  given Decoder[MinerStatus] = Decoder.decodeString.emap(s=>MinerStatus.values.find(_.toString==s).toRight("未知矿工状态"))

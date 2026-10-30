package services.game.objects
import io.circe.{Decoder,Encoder}
enum EvidenceKind:
  case testimony, document, observation
object EvidenceKind:
  given Encoder[EvidenceKind] = Encoder.encodeString.contramap(_.toString)
  given Decoder[EvidenceKind] = Decoder.decodeString.emap(s=>EvidenceKind.values.find(_.toString==s).toRight("未知线索来源类型"))

package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class NpcFact(text: String, source: String)
object NpcFact:
  given Encoder[NpcFact] = deriveEncoder
  given Decoder[NpcFact] = deriveDecoder

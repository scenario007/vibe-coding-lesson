package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class Recovery(source: String, damage: Int)
object Recovery:
  given Encoder[Recovery] = deriveEncoder
  given Decoder[Recovery] = deriveDecoder

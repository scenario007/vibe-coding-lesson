package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class Battle(enemy: String, health: Int, maximum: Int, round: Int)
object Battle:
  given Encoder[Battle] = deriveEncoder
  given Decoder[Battle] = deriveDecoder

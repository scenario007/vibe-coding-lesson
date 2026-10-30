package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class PlayerProfile(background: String, secret: Option[String], secretKnownBy: List[String], stats: Option[PlayerStats] = None)
object PlayerProfile:
  given Encoder[PlayerProfile] = deriveEncoder
  given Decoder[PlayerProfile] = deriveDecoder

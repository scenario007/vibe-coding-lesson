package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class RoleOption(name: String, description: String, unlocked: Boolean, unlockCondition: String)
object RoleOption:
  given Encoder[RoleOption] = deriveEncoder
  given Decoder[RoleOption] = deriveDecoder

package services.game.objects.apiTypes

import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*

final case class GrowthOption(id: String, name: String, available: Boolean, reason: Option[String])
object GrowthOption:
  given Encoder[GrowthOption] = deriveEncoder
  given Decoder[GrowthOption] = deriveDecoder

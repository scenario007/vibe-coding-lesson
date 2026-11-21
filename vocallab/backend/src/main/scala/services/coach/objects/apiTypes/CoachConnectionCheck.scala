package services.coach.objects.apiTypes

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachConnectionCheck(status: String, message: String)

object CoachConnectionCheck:
  given Codec.AsObject[CoachConnectionCheck] = deriveCodec

package services.coach.objects.apiTypes

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachConnectionTest(text: CoachConnectionCheck, search: CoachConnectionCheck)

object CoachConnectionTest:
  given Codec.AsObject[CoachConnectionTest] = deriveCodec

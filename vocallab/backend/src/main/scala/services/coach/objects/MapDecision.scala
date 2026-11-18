package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class MapDecision(
  choices: Vector[MapChoice],
  limitations: Vector[String]
)

object MapDecision:
  given Codec.AsObject[MapDecision] = deriveCodec

package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class AcousticCandidate(
  id: String,
  tool: String,
  start: Double,
  end: Double,
  measurement: Measurement
)

object AcousticCandidate:
  given Codec.AsObject[AcousticCandidate] = deriveCodec

package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class AcousticBatch(
  version: Int,
  candidates: Vector[AcousticCandidate],
  observations: Vector[AcousticObservation],
  runs: Vector[ToolRun]
)

object AcousticBatch:
  given Codec.AsObject[AcousticBatch] = deriveCodec

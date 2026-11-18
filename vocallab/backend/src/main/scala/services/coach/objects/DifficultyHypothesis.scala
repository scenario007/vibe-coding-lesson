package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class DifficultyHypothesis(
  description: String,
  locationHint: String,
  sourceIds: Vector[String]
)

object DifficultyHypothesis:
  given Codec.AsObject[DifficultyHypothesis] = deriveCodec

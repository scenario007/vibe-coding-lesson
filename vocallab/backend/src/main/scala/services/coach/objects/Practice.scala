package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class Practice(
  goal: String,
  steps: Vector[String],
  difficulty: String,
  verification: String
)

object Practice:
  given Codec.AsObject[Practice] = deriveCodec

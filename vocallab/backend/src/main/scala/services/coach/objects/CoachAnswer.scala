package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachAnswer(
  answer: String,
  evidenceIds: Vector[String]
)

object CoachAnswer:
  given Codec.AsObject[CoachAnswer] = deriveCodec

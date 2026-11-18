package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachFeedback(
  segmentId: String,
  evidenceIds: Vector[String],
  observation: String,
  interpretation: String,
  practice: Practice
)

object CoachFeedback:
  given Codec.AsObject[CoachFeedback] = deriveCodec

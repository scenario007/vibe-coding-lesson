package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachReport(
  summary: String,
  strengths: Vector[CoachFeedback],
  priorities: Vector[CoachFeedback],
  limitations: Vector[String]
)

object CoachReport:
  given Codec.AsObject[CoachReport] = deriveCodec

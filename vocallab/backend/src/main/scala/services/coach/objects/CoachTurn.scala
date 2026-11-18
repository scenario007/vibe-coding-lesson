package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachTurn(
  question: String,
  segmentId: Option[String],
  range: Option[(Double, Double)],
  answer: CoachAnswer,
  observations: Vector[AcousticObservation],
  runs: Vector[ToolRun]
)

object CoachTurn:
  given Codec.AsObject[CoachTurn] = deriveCodec

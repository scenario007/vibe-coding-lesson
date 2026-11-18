package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class PitchScoreNote(
  start: Double,
  end: Double,
  status: PitchScoreStatus,
  referenceMidi: Double,
  score: Option[Double],
  deviationCents: Option[Double]
)

object PitchScoreNote:
  given Encoder[PitchScoreNote] = deriveEncoder[PitchScoreNote]
  given Decoder[PitchScoreNote] = deriveDecoder[PitchScoreNote]

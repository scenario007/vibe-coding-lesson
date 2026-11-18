package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class PitchScorePhrase(
  start: Double,
  end: Double,
  status: PitchScoreStatus,
  score: Option[Double],
  totalNotes: Int,
  scoredNotes: Int,
  missedNotes: Int,
  pairedFrames: Int,
  octaveUncertainFrames: Int,
  deviationCents: Option[Double],
  driftCents: Option[Double],
  timingMilliseconds: Option[Int],
  notes: Vector[PitchScoreNote]
)

object PitchScorePhrase:
  given Encoder[PitchScorePhrase] = deriveEncoder[PitchScorePhrase]
  given Decoder[PitchScorePhrase] = deriveDecoder[PitchScorePhrase]

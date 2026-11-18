package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class PitchScore(
  version: Int,
  start: Double,
  end: Double,
  status: PitchScoreStatus,
  score: Option[Double],
  coverage: Double,
  totalNotes: Int,
  scoredNotes: Int,
  missedNotes: Int,
  pairedFrames: Int,
  scoredPhrases: Int,
  pendingPhrases: Int,
  phrases: Vector[PitchScorePhrase],
  elapsedMilliseconds: Double,
  evidenceMilliseconds: Double
)

object PitchScore:
  given Encoder[PitchScore] = deriveEncoder[PitchScore]
  given Decoder[PitchScore] = deriveDecoder[PitchScore]

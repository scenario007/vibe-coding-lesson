package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
import java.util.UUID

final case class AnalysisReport(
  analysisId: UUID,
  status: JobStatus,
  referenceMetadata: MediaMetadata,
  userMetadata: MediaMetadata,
  preprocessing: Preprocessing,
  separation: TrackPair[Separation],
  alignment: Alignment,
  pitchTracks: TrackPair[PitchTrack],
  metrics: Vector[Metric],
  segments: Vector[Segment],
  phrases: Vector[Phrase],
  warnings: Vector[String],
  confidence: Double,
  pitchScore: Option[PitchScore]
)

object AnalysisReport:
  given Encoder[AnalysisReport] = deriveEncoder[AnalysisReport]
  given Decoder[AnalysisReport] = deriveDecoder[AnalysisReport]

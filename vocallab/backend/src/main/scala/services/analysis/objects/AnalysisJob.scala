package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
import java.util.UUID

final case class AnalysisJob(
  analysisId: UUID,
  status: JobStatus,
  stage: Stage,
  error: Option[String],
  selection: AnalysisSelection,
  createdAt: String
)

object AnalysisJob:
  given Encoder[AnalysisJob] = deriveEncoder[AnalysisJob]
  given Decoder[AnalysisJob] = deriveDecoder[AnalysisJob]

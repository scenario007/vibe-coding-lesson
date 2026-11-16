package services.analysis.objects.apiTypes

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
import java.util.UUID
import services.analysis.objects.*

final case class AnalysisIdRequest(
  analysisId: UUID
)

object AnalysisIdRequest:
  given Encoder[AnalysisIdRequest] = deriveEncoder[AnalysisIdRequest]
  given Decoder[AnalysisIdRequest] = deriveDecoder[AnalysisIdRequest]

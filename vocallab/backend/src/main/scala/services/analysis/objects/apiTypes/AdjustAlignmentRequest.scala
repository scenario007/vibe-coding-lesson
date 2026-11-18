package services.analysis.objects.apiTypes

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
import java.util.UUID
import services.analysis.objects.*

final case class AdjustAlignmentRequest(
  analysisId: UUID,
  manualOffset: Option[Double],
  referenceRange: Option[(Double, Double)]
)

object AdjustAlignmentRequest:
  given Encoder[AdjustAlignmentRequest] = deriveEncoder[AdjustAlignmentRequest]
  given Decoder[AdjustAlignmentRequest] = deriveDecoder[AdjustAlignmentRequest]

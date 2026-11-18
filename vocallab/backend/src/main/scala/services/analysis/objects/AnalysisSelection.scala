package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class AnalysisSelection(
  reference: ClipSelection,
  user: ClipSelection,
  manualOffset: Option[Double],
  alignmentReferenceRange: Option[(Double, Double)] = None
)

object AnalysisSelection:
  given Encoder[AnalysisSelection] = deriveEncoder[AnalysisSelection]
  given Decoder[AnalysisSelection] = deriveDecoder[AnalysisSelection]

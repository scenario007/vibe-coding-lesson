package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class AlignmentDetection(
  referenceRange: Option[(Double, Double)],
  offsetSeconds: Option[Double],
  originalOffsetSeconds: Option[Double],
  confidence: Double,
  reliable: Boolean,
  method: AlignmentMethod,
  featureScores: Map[String, AlignmentFeatureScore],
  warnings: Vector[String],
  featureMilliseconds: Double,
  correlationMilliseconds: Double,
  elapsedMilliseconds: Double,
  openingWindow: Option[Boolean]
)

object AlignmentDetection:
  given Encoder[AlignmentDetection] = deriveEncoder[AlignmentDetection]
  given Decoder[AlignmentDetection] = deriveDecoder[AlignmentDetection]

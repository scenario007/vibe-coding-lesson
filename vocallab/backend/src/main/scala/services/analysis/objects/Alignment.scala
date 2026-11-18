package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class Alignment(
  offset: Double,
  tempoRatio: Double,
  transposeSemitones: Option[Int],
  confidence: Double,
  reliable: Boolean,
  warnings: Vector[String],
  manualOffset: Option[Double],
  timeMapping: Vector[(Double, Double)],
  method: Option[AlignmentMethod],
  offsetSeconds: Option[Double],
  originalOffsetSeconds: Option[Double],
  featureScores: Option[Map[String, AlignmentFeatureScore]],
  automatic: Option[AlignmentDetection]
)

object Alignment:
  given Encoder[Alignment] = deriveEncoder[Alignment]
  given Decoder[Alignment] = deriveDecoder[Alignment]

package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class AlignmentFeatureScore(offsetSeconds: Double, score: Double, peakScore: Double)

object AlignmentFeatureScore:
  given Encoder[AlignmentFeatureScore] = deriveEncoder[AlignmentFeatureScore]
  given Decoder[AlignmentFeatureScore] = deriveDecoder[AlignmentFeatureScore]

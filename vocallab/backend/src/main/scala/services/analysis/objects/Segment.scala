package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class Segment(
  `type`: SegmentType,
  referenceStart: Option[Double],
  referenceEnd: Option[Double],
  userStart: Option[Double],
  userEnd: Option[Double],
  evidence: Map[String, Double],
  confidence: Double
)

object Segment:
  given Encoder[Segment] = deriveEncoder[Segment]
  given Decoder[Segment] = deriveDecoder[Segment]

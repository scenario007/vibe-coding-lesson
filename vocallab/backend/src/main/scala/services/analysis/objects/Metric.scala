package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class Metric(
  name: MetricName,
  value: Option[Double],
  unit: MetricUnit,
  validFrames: Int,
  coverage: Double
)

object Metric:
  given Encoder[Metric] = deriveEncoder[Metric]
  given Decoder[Metric] = deriveDecoder[Metric]

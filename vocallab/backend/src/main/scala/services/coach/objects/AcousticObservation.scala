package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class AcousticObservation(
  id: String,
  segmentId: String,
  tool: String,
  status: String,
  reference: Measurement,
  user: Option[Measurement],
  userRange: Option[(Double, Double)],
  comparison: Map[String, Double]
)

object AcousticObservation:
  given Codec.AsObject[AcousticObservation] = deriveCodec

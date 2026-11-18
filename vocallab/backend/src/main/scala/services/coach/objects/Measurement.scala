package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class Measurement(
  status: String,
  coverage: Double,
  source: String,
  pitchSource: String,
  warnings: Vector[String],
  metrics: Map[String, Double]
)

object Measurement:
  given Codec.AsObject[Measurement] = deriveCodec

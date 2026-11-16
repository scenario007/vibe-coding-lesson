package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class Preprocessing(
  sampleRate: Int,
  method: String,
  referenceStart: Double,
  userStart: Double,
  referenceDuration: Double,
  userDuration: Double
)

object Preprocessing:
  given Encoder[Preprocessing] = deriveEncoder[Preprocessing]
  given Decoder[Preprocessing] = deriveDecoder[Preprocessing]

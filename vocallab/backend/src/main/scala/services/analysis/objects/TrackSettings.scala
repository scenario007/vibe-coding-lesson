package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class TrackSettings(
  trim: Double,
  duration: Double,
  start: Double,
  separate: Boolean,
  identity: String
)

object TrackSettings:
  given Encoder[TrackSettings] = deriveEncoder[TrackSettings]
  given Decoder[TrackSettings] = deriveDecoder[TrackSettings]

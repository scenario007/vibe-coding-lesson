package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class Separation(
  enabled: Boolean,
  model: Option[String],
  modelVersion: Option[String],
  status: SeparationStatus,
  outputTracks: Vector[TrackKind],
  inputTrack: TrackKind,
  warnings: Vector[String],
  weightSha256: Option[String],
  device: Option[String],
  cached: Boolean,
  parameters: Option[SeparationParameters]
)

object Separation:
  given Encoder[Separation] = deriveEncoder[Separation]
  given Decoder[Separation] = deriveDecoder[Separation]

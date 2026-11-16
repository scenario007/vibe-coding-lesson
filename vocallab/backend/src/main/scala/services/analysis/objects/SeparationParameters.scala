package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class SeparationParameters(
  segment_size: Int,
  override_model_segment_size: Boolean,
  overlap: Int,
  batch_size: Int,
  pitch_shift: Int
)

object SeparationParameters:
  given Encoder[SeparationParameters] = deriveEncoder[SeparationParameters]
  given Decoder[SeparationParameters] = deriveDecoder[SeparationParameters]

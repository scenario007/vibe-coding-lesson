package services.analysis.objects.apiTypes

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
import services.analysis.objects.*

final case class MediaLimits(
  maxBytes: Long,
  maxClip: Int
)

object MediaLimits:
  given Encoder[MediaLimits] = deriveEncoder[MediaLimits]
  given Decoder[MediaLimits] = deriveDecoder[MediaLimits]

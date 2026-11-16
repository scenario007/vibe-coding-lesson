package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
import java.util.UUID

final case class MediaMetadata(
  id: UUID,
  name: String,
  format: MediaFormat,
  duration: Double,
  sizeBytes: Long,
  sampleRate: Int,
  channels: Int,
  audioStream: Int,
  audioStreams: Int,
  audioStart: Double,
  hasVideo: Boolean
)

object MediaMetadata:
  given Encoder[MediaMetadata] = deriveEncoder[MediaMetadata]
  given Decoder[MediaMetadata] = deriveDecoder[MediaMetadata]

package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class StoredMedia(
  metadata: MediaMetadata,
  digest: String
)

object StoredMedia:
  given Encoder[StoredMedia] = deriveEncoder[StoredMedia]
  given Decoder[StoredMedia] = deriveDecoder[StoredMedia]

package services.lyrics.objects.apiTypes

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class GetLyricsRequest(id: Long)

object GetLyricsRequest:
  given Encoder[GetLyricsRequest] = deriveEncoder[GetLyricsRequest]
  given Decoder[GetLyricsRequest] = deriveDecoder[GetLyricsRequest]

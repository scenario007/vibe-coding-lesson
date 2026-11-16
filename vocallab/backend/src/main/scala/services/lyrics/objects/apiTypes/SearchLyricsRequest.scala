package services.lyrics.objects.apiTypes

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class SearchLyricsRequest(title: String, artist: String)

object SearchLyricsRequest:
  given Encoder[SearchLyricsRequest] = deriveEncoder[SearchLyricsRequest]
  given Decoder[SearchLyricsRequest] = deriveDecoder[SearchLyricsRequest]

package services.lyrics.objects.apiTypes

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class GetLyricsResponse(id: Long, syncedLyrics: Option[String])

object GetLyricsResponse:
  given Encoder[GetLyricsResponse] = deriveEncoder[GetLyricsResponse]
  given Decoder[GetLyricsResponse] = deriveDecoder[GetLyricsResponse]

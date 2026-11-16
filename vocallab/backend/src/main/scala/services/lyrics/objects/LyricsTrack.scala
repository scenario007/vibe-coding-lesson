package services.lyrics.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class LyricsTrack(id: Long, trackName: String, artistName: String,
                             albumName: Option[String], duration: Double, hasSyncedLyrics: Boolean)

object LyricsTrack:
  given Encoder[LyricsTrack] = deriveEncoder[LyricsTrack]
  given Decoder[LyricsTrack] = deriveDecoder[LyricsTrack]

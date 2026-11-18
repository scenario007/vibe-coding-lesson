package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class SongInfo(
  title: String,
  artist: String,
  version: String,
  notes: String
)

object SongInfo:
  given Codec.AsObject[SongInfo] = deriveCodec

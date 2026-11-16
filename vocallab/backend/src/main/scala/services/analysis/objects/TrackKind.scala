package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum TrackKind:
  case original, vocals, instrumental

object TrackKind:
  def fromString(raw: String): Either[String, TrackKind] =
    values.find(_.toString == raw.trim).toRight("Unsupported TrackKind")

  given Encoder[TrackKind] = Encoder.encodeString.contramap(_.toString)
  given Decoder[TrackKind] = Decoder.decodeString.emap(fromString)

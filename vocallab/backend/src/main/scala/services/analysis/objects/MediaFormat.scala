package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum MediaFormat:
  case wav, mp3, m4a, mp4, mov

object MediaFormat:
  def fromString(raw: String): Either[String, MediaFormat] =
    values.find(_.toString == raw.trim).toRight("Unsupported MediaFormat")

  given Encoder[MediaFormat] = Encoder.encodeString.contramap(_.toString)
  given Decoder[MediaFormat] = Decoder.decodeString.emap(fromString)

package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum SeparationStatus:
  case completed, skipped

object SeparationStatus:
  def fromString(raw: String): Either[String, SeparationStatus] =
    values.find(_.toString == raw.trim).toRight("Unsupported SeparationStatus")

  given Encoder[SeparationStatus] = Encoder.encodeString.contramap(_.toString)
  given Decoder[SeparationStatus] = Decoder.decodeString.emap(fromString)

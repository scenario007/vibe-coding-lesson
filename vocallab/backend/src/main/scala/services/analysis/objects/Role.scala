package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum Role:
  case reference, user

object Role:
  def fromString(raw: String): Either[String, Role] =
    values.find(_.toString == raw.trim).toRight("Unsupported Role")

  given Encoder[Role] = Encoder.encodeString.contramap(_.toString)
  given Decoder[Role] = Decoder.decodeString.emap(fromString)

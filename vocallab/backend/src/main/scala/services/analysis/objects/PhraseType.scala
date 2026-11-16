package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum PhraseType:
  case sustained, high

object PhraseType:
  def fromString(raw: String): Either[String, PhraseType] =
    values.find(_.toString == raw.trim).toRight("Unsupported PhraseType")

  given Encoder[PhraseType] = Encoder.encodeString.contramap(_.toString)
  given Decoder[PhraseType] = Decoder.decodeString.emap(fromString)

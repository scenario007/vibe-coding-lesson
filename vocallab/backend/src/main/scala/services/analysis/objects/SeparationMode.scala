package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum SeparationMode:
  case fast, precise

object SeparationMode:
  given Encoder[SeparationMode] = Encoder.encodeString.contramap(_.toString)
  given Decoder[SeparationMode] = Decoder.decodeString.emap(value =>
    values.find(_.toString == value).toRight("Unsupported separation mode"))

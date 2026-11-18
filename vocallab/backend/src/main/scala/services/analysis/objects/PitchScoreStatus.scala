package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum PitchScoreStatus:
  case scored, missed, insufficient, alignment

object PitchScoreStatus:
  given Encoder[PitchScoreStatus] = Encoder.encodeString.contramap(_.toString)
  given Decoder[PitchScoreStatus] = Decoder.decodeString.emap(value =>
    values.find(_.toString == value).toRight("Unsupported pitch score status"))

package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum AlignmentMethod:
  case pitch, guide, manual

object AlignmentMethod:
  given Encoder[AlignmentMethod] = Encoder.encodeString.contramap(_.toString)
  given Decoder[AlignmentMethod] = Decoder.decodeString.emap(value =>
    values.find(_.toString == value).toRight("Unsupported alignment method"))

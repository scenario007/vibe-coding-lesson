package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum SegmentType:
  case sharp, flat, drift, interruption, high_drop, high_interruption, uncertain_pitch

object SegmentType:
  def fromString(raw: String): Either[String, SegmentType] =
    values.find(_.toString == raw.trim).toRight("Unsupported SegmentType")

  given Encoder[SegmentType] = Encoder.encodeString.contramap(_.toString)
  given Decoder[SegmentType] = Decoder.decodeString.emap(fromString)

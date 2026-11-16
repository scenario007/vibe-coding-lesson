package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum MetricUnit:
  case ratio, cent, second

object MetricUnit:
  def fromString(raw: String): Either[String, MetricUnit] =
    values.find(_.toString == raw.trim).toRight("Unsupported MetricUnit")

  given Encoder[MetricUnit] = Encoder.encodeString.contramap(_.toString)
  given Decoder[MetricUnit] = Decoder.decodeString.emap(fromString)

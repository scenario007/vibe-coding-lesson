package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum MetricName:
  case pitchHitRate, meanAbsoluteCents, transposedHitRate, matchedCoverage, referenceF0Coverage, userF0Coverage, medianTimingDeviation, highContinuity

object MetricName:
  def fromString(raw: String): Either[String, MetricName] =
    values.find(_.toString == raw.trim).toRight("Unsupported MetricName")

  given Encoder[MetricName] = Encoder.encodeString.contramap(_.toString)
  given Decoder[MetricName] = Decoder.decodeString.emap(fromString)

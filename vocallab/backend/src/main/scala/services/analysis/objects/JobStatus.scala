package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum JobStatus:
  case pending, processing, completed, failed

object JobStatus:
  def fromString(raw: String): Either[String, JobStatus] =
    values.find(_.toString == raw.trim).toRight("Unsupported JobStatus")

  given Encoder[JobStatus] = Encoder.encodeString.contramap(_.toString)
  given Decoder[JobStatus] = Decoder.decodeString.emap(fromString)

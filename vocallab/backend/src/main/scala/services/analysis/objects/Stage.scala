package services.analysis.objects

import io.circe.{Decoder, Encoder}

enum Stage:
  case queued, decode, separation_reference, separation_user, pitch_reference, pitch_user, alignment, metrics, report, completed, failed

object Stage:
  def fromString(raw: String): Either[String, Stage] =
    values.find(_.toString == raw.trim).toRight("Unsupported Stage")

  given Encoder[Stage] = Encoder.encodeString.contramap(_.toString)
  given Decoder[Stage] = Decoder.decodeString.emap(fromString)

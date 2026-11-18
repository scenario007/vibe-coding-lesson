package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class PitchTrack(
  timestamps: Vector[Double],
  originalStart: Double,
  f0Hz: Vector[Option[Double]],
  midiPitch: Vector[Option[Double]],
  voicedFlags: Vector[Boolean],
  voicedProbabilities: Vector[Double],
  rms: Vector[Double],
  guideMidiPitch: Option[Vector[Option[Double]]],
  quality: Option[Double]
)

object PitchTrack:
  given Encoder[PitchTrack] = deriveEncoder[PitchTrack]
  given Decoder[PitchTrack] = deriveDecoder[PitchTrack]

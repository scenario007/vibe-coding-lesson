package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class HarmonicPitch(step: Double, midiPitch: List[Option[Double]])

object HarmonicPitch:
  given Encoder[HarmonicPitch] = deriveEncoder
  given Decoder[HarmonicPitch] = deriveDecoder

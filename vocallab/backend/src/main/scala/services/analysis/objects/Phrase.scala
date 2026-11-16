package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class Phrase(
  `type`: PhraseType,
  referenceStart: Double,
  referenceEnd: Double,
  frames: Int,
  continuity: Double,
  driftCents: Option[Double],
  medianCents: Option[Double],
  hitRate: Option[Double]
)

object Phrase:
  given Encoder[Phrase] = deriveEncoder[Phrase]
  given Decoder[Phrase] = deriveDecoder[Phrase]

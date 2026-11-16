package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*

final case class TrackPair[A](reference: A, user: A)

object TrackPair:
  given [A: Encoder]: Encoder[TrackPair[A]] = deriveEncoder[TrackPair[A]]
  given [A: Decoder]: Decoder[TrackPair[A]] = deriveDecoder[TrackPair[A]]

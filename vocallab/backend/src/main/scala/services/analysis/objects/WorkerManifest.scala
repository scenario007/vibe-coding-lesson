package services.analysis.objects

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
import java.util.UUID

final case class WorkerManifest(
  analysisId: UUID,
  workspace: String,
  models: String,
  cache: String,
  clips: TrackPair[TrackSettings],
  referenceMetadata: MediaMetadata,
  userMetadata: MediaMetadata,
  manualOffset: Option[Double],
  alignmentReferenceRange: Option[(Double, Double)] = None
)

object WorkerManifest:
  given Encoder[WorkerManifest] = deriveEncoder[WorkerManifest]
  given Decoder[WorkerManifest] = deriveDecoder[WorkerManifest]

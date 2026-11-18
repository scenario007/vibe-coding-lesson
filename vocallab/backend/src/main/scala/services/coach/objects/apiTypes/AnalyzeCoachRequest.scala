package services.coach.objects.apiTypes

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import services.coach.objects.*

final case class AnalyzeCoachRequest(
  analysisId: java.util.UUID,
  song: SongInfo,
  deep: Boolean,
  extraTools: Vector[String],
  highThreshold: Option[Double],
  refresh: Boolean,
  recheck: Option[Boolean]
)

object AnalyzeCoachRequest:
  given Codec.AsObject[AnalyzeCoachRequest] = deriveCodec

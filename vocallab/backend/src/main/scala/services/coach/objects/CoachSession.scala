package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachSession(
  revision: String,
  mode: String,
  song: SongInfo,
  sources: Vector[ResearchSource],
  researchStatus: String,
  plan: CoachPlan,
  candidates: Vector[AcousticCandidate],
  difficulties: Vector[Difficulty],
  observations: Vector[AcousticObservation],
  runs: Vector[ToolRun],
  report: Option[CoachReport],
  history: Vector[CoachTurn],
  model: Option[String],
  warnings: Vector[String],
  requestedTools: Vector[String],
  highThreshold: Option[Double],
  provider: Option[String]
)

object CoachSession:
  given Codec.AsObject[CoachSession] = deriveCodec

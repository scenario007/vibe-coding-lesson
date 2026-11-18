package services.coach.objects

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

final case class CoachPlan(
  summary: String,
  hypotheses: Vector[DifficultyHypothesis],
  tools: Vector[ToolChoice],
  limitations: Vector[String]
)

object CoachPlan:
  given Codec.AsObject[CoachPlan] = deriveCodec

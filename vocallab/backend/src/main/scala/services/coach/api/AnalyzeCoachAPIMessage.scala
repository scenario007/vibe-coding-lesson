package services.coach.api

import cats.effect.IO
import java.sql.Connection
import services.analysis.api.GetAnalysisResultAPIMessage
import services.coach.objects.apiTypes.{AnalyzeCoachRequest, CoachView}
import services.coach.utils.CoachWorkflow
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class AnalyzeCoachAPIMessage(input: AnalyzeCoachRequest, config: AppConfig) extends APIMessage[CoachView]:
  def plan(connection: Connection): IO[CoachView] =
    GetAnalysisResultAPIMessage(input.analysisId, config).plan(connection)
      .flatMap(report => CoachWorkflow.analyze(config, report, input))

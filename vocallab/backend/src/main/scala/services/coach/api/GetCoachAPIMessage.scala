package services.coach.api

import cats.effect.IO
import java.sql.Connection
import services.analysis.api.GetAnalysisResultAPIMessage
import services.analysis.objects.apiTypes.AnalysisIdRequest
import services.coach.objects.apiTypes.CoachView
import services.coach.utils.CoachWorkflow
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class GetCoachAPIMessage(input: AnalysisIdRequest, config: AppConfig) extends APIMessage[CoachView]:
  def plan(connection: Connection): IO[CoachView] =
    GetAnalysisResultAPIMessage(input.analysisId, config).plan(connection)
      .flatMap(report => CoachWorkflow.get(config, report))

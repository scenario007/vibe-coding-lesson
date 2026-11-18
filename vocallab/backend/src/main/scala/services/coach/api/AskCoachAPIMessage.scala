package services.coach.api

import cats.effect.IO
import java.sql.Connection
import services.analysis.api.GetAnalysisResultAPIMessage
import services.coach.objects.apiTypes.{AskCoachRequest, CoachView}
import services.coach.utils.CoachWorkflow
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class AskCoachAPIMessage(input: AskCoachRequest, config: AppConfig) extends APIMessage[CoachView]:
  def plan(connection: Connection): IO[CoachView] =
    GetAnalysisResultAPIMessage(input.analysisId, config).plan(connection)
      .flatMap(report => CoachWorkflow.ask(config, report, input))

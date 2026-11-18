package services.coach.api

import cats.effect.IO
import java.sql.Connection
import services.analysis.api.GetAnalysisResultAPIMessage
import services.coach.objects.apiTypes.*
import services.coach.utils.CoachWorkflow
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class SetCoachKeyAPIMessage(input: SetCoachKeyRequest, config: AppConfig) extends APIMessage[CoachView]:
  def plan(connection: Connection): IO[CoachView] =
    GetAnalysisResultAPIMessage(input.analysisId, config).plan(connection)
      .flatMap(report => CoachWorkflow.updateKey(config, report, input))

package services.coach.api

import cats.effect.IO
import java.sql.Connection
import services.analysis.api.GetAnalysisResultAPIMessage
import services.coach.objects.apiTypes.{EditDifficultyRequest, CoachView}
import services.coach.utils.CoachWorkflow
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class EditDifficultyAPIMessage(input: EditDifficultyRequest, config: AppConfig) extends APIMessage[CoachView]:
  def plan(connection: Connection): IO[CoachView] =
    GetAnalysisResultAPIMessage(input.analysisId, config).plan(connection)
      .flatMap(report => CoachWorkflow.edit(config, report, input))

package services.analysis.api

import cats.effect.IO
import java.sql.Connection
import services.analysis.objects.*
import services.analysis.objects.apiTypes.AdjustAlignmentRequest
import services.analysis.utils.AnalysisValidation
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class AdjustAlignmentAPIMessage(input: AdjustAlignmentRequest, config: AppConfig)
    extends APIMessage[AnalysisJob]:
  def plan(connection: Connection): IO[AnalysisJob] =
    for
      previous <- AnalysisValidation.job(connection, input.analysisId)
      job <- CreateAnalysisAPIMessage(previous.selection.copy(manualOffset = input.manualOffset), config).plan(connection)
    yield job

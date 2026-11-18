package services.analysis.api

import cats.effect.IO
import java.sql.Connection
import org.http4s.Status
import services.analysis.objects.*
import services.analysis.objects.apiTypes.AdjustAlignmentRequest
import services.analysis.utils.{AnalysisValidation, PythonWorker}
import services.system.api.APIMessage
import services.system.objects.{ApiError, AppConfig}

final case class AdjustAlignmentAPIMessage(input: AdjustAlignmentRequest, config: AppConfig)
    extends APIMessage[AnalysisReport]:
  def plan(connection: Connection): IO[AnalysisReport] =
    for
      job <- AnalysisValidation.job(connection, input.analysisId)
      _ <- IO.raiseUnless(job.status == JobStatus.completed)(ApiError(Status.Conflict, "分析报告尚不可用。"))
      _ <- AnalysisValidation.alignmentAdjustment(job.selection, input.manualOffset, input.referenceRange)
      report <- PythonWorker.realign(job, input, config)
    yield report

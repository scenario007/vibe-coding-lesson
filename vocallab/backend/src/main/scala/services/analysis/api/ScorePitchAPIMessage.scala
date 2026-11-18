package services.analysis.api

import cats.effect.IO
import java.sql.Connection
import java.util.UUID
import services.analysis.objects.AnalysisReport
import services.analysis.utils.{AnalysisValidation, PythonWorker}
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class ScorePitchAPIMessage(id: UUID, config: AppConfig) extends APIMessage[AnalysisReport]:
  def plan(connection: Connection): IO[AnalysisReport] =
    GetAnalysisResultAPIMessage(id, config).plan(connection).flatMap { report =>
      if report.pitchScore.nonEmpty then IO.pure(report)
      else AnalysisValidation.job(connection, id).flatMap(job => PythonWorker.score(job, config))
    }

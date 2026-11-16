package services.analysis.api

import cats.effect.IO
import io.circe.parser.decode
import java.nio.file.Files
import java.sql.Connection
import java.util.UUID
import org.http4s.Status
import services.analysis.objects.*
import services.analysis.utils.{AnalysisValidation, LocalFiles}
import services.system.api.APIMessage
import services.system.objects.{ApiError, AppConfig}

final case class GetAnalysisResultAPIMessage(id: UUID, config: AppConfig) extends APIMessage[AnalysisReport]:
  def plan(connection: Connection): IO[AnalysisReport] =
    for
      job <- AnalysisValidation.job(connection, id)
      _ <- IO.raiseUnless(job.status == JobStatus.completed)(ApiError(Status.Conflict, "分析报告尚不可用。"))
      raw <- IO.blocking(Files.readString(LocalFiles.analysis(config, id).resolve("result.json")))
      result <- IO.fromEither(decode[AnalysisReport](raw))
      verified <- AnalysisValidation.report(result, job)
    yield verified

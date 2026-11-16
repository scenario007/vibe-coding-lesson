package services.analysis.api

import cats.effect.IO
import java.sql.Connection
import java.util.UUID
import services.analysis.objects.AnalysisJob
import services.analysis.utils.AnalysisValidation
import services.system.api.APIMessage

final case class GetAnalysisAPIMessage(id: UUID) extends APIMessage[AnalysisJob]:
  def plan(connection: Connection): IO[AnalysisJob] = AnalysisValidation.job(connection, id)

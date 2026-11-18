package services.coach.api

import cats.effect.IO
import java.sql.Connection
import services.analysis.api.GetAnalysisResultAPIMessage
import services.coach.objects.apiTypes.*
import services.coach.objects.ResearchResult
import services.coach.utils.CoachWorkflow
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class LookupCoachSourcesAPIMessage(input: LookupCoachSourcesRequest, config: AppConfig) extends APIMessage[ResearchResult]:
  def plan(connection: Connection): IO[ResearchResult] =
    GetAnalysisResultAPIMessage(input.analysisId, config).plan(connection)
      .flatMap(report => CoachWorkflow.lookup(config, report, input.song))

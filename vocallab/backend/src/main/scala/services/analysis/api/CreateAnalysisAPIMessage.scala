package services.analysis.api

import cats.effect.IO
import java.sql.Connection
import java.util.UUID
import services.analysis.objects.*
import services.analysis.tables.AlignmentWindowTable.AlignmentWindowTable
import services.analysis.tables.AnalysisTable.AnalysisTable
import services.analysis.utils.AnalysisValidation
import services.system.api.APIMessage
import services.system.objects.AppConfig

final case class CreateAnalysisAPIMessage(selection: AnalysisSelection, config: AppConfig)
    extends APIMessage[AnalysisJob]:
  def plan(connection: Connection): IO[AnalysisJob] =
    for
      _ <- AnalysisValidation.selection(connection, selection, config)
      inherited <- if selection.manualOffset.isEmpty then AlignmentWindowTable.find(connection, selection)
                   else IO.pure(None)
      referenceRange = inherited.filter(AnalysisValidation.referenceRangeFits(selection, _))
      id <- IO.delay(UUID.randomUUID())
      job <- AnalysisTable.insert(connection, id, selection.copy(alignmentReferenceRange = referenceRange))
    yield job

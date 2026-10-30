package services.game.api
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import services.game.objects.Adventure
import services.game.tables.OutcomeTable.OutcomeTable
import services.game.utils.OutcomeSummary
object RecordOutcome:
  def apply(c: Connection,before: Adventure,after: Adventure,success: Boolean): IO[Unit] =
    if (!before.dead && after.dead) || (!before.sealedEnding && after.sealedEnding) then
      val kind=if after.dead then "death" else if success then "success" else "failure"
      val summary=OutcomeSummary.describe(after)
      IO(UUID.randomUUID().toString).flatMap(id=>OutcomeTable.insert(c,id,after.name,kind,after.hour,summary)).void
    else IO.unit

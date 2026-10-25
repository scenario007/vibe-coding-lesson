package services.ai.api
import cats.effect.IO
import java.sql.Connection
import services.users.objects.UserId
import services.system.api.APIWithTokenMessage
import services.ai.objects.apiTypes.UsageReport
import services.ai.objects.AssetStatus
import services.ai.tables.usageEvent.UsageEventTable
import services.ai.utils.{AssetLedger,UsageMeter}
final case class GetUsageReportAPIMessage(userId: UserId) extends APIWithTokenMessage[UsageReport]:
  override def plan(connection: Connection): IO[UsageReport] =
    for
      assets <- AssetLedger.read
      totals <- UsageEventTable.totals(connection)
      events <- UsageEventTable.listForUser(connection,userId)
      now <- IO.realTime.map(_.toMillis)
      art = assets.filter(v=>v.status==AssetStatus.succeeded && v.tokens.nonEmpty).map(_.estimatedCny).sum
      held = assets.filterNot(v=>v.status==AssetStatus.succeeded && v.tokens.nonEmpty).map(_.estimatedCny).sum
    yield UsageReport(UsageMeter.budget,totals.measuredCny,totals.heldCny,art,held,(UsageMeter.budget-totals.measuredCny-totals.heldCny-art-held).max(BigDecimal(0)),totals.totalTokens+assets.flatMap(_.tokens).sum,events,assets,false,"2026-10-25",now)

package services.ai.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.tables.AdventureTable.AdventureTable
import services.ai.objects.UsageReport
import services.ai.utils.SharedLedger
final case class GetUsageReportAPIMessage(id: String) extends APIMessage[UsageReport]:
  def plan(c: Connection): IO[UsageReport] = for
    _ <- AdventureTable.find(c,id).flatMap(v => IO.fromOption(v)(AppError(404,"档案不存在")))
    report <- SharedLedger.report(id)
  yield report
object GetUsageReportAPIMessage:
  given Encoder[GetUsageReportAPIMessage] = deriveEncoder
  given Decoder[GetUsageReportAPIMessage] = deriveDecoder

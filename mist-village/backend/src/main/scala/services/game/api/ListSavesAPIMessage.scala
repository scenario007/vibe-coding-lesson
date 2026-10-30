package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.SaveSummary
import services.game.tables.AdventureTable.AdventureTable
final case class ListSavesAPIMessage(id: String) extends APIMessage[List[SaveSummary]]:
  def plan(c: Connection): IO[List[SaveSummary]] = for
    _ <- AdventureTable.find(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    saves <- AdventureTable.listSaves(c,id)
  yield saves
object ListSavesAPIMessage:
  given Encoder[ListSavesAPIMessage] = deriveEncoder
  given Decoder[ListSavesAPIMessage] = deriveDecoder

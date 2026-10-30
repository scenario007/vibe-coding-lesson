package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.NoRequestMessage
import services.game.objects.OutcomeRecord
import services.game.tables.OutcomeTable.OutcomeTable
final case class ListOutcomesAPIMessage() extends NoRequestMessage[List[OutcomeRecord]]:
  def plan(c: Connection): IO[List[OutcomeRecord]] = OutcomeTable.list(c)
object ListOutcomesAPIMessage:
  given Encoder[ListOutcomesAPIMessage] = deriveEncoder
  given Decoder[ListOutcomesAPIMessage] = deriveDecoder

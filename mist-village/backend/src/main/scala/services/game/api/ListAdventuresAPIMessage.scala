package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.NoRequestMessage
import services.game.objects.*
import services.game.tables.AdventureTable.AdventureTable
final case class ListAdventuresAPIMessage() extends NoRequestMessage[List[AdventureView]]:
  def plan(c: Connection): IO[List[AdventureView]] = AdventureTable.list(c).map(_.map(AdventureView.from))
object ListAdventuresAPIMessage:
  given Encoder[ListAdventuresAPIMessage] = deriveEncoder
  given Decoder[ListAdventuresAPIMessage] = deriveDecoder

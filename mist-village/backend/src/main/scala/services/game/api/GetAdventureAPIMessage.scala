package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.*
import services.game.tables.AdventureTable.AdventureTable
final case class GetAdventureAPIMessage(id: String) extends APIMessage[AdventureView]:
  def plan(c: Connection): IO[AdventureView] = AdventureTable.find(c,id).flatMap(a => IO.fromOption(a)(AppError(404,"档案不存在"))).map(AdventureView.from)
object GetAdventureAPIMessage:
  given Encoder[GetAdventureAPIMessage] = deriveEncoder
  given Decoder[GetAdventureAPIMessage] = deriveDecoder

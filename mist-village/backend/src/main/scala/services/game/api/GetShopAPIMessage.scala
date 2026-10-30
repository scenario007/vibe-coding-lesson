package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.ShopItem
import services.game.objects.NpcCondition
import services.game.tables.AdventureTable.AdventureTable
import services.game.utils.Rules
final case class GetShopAPIMessage(id: String) extends APIMessage[List[ShopItem]]:
  def plan(c: Connection): IO[List[ShopItem]] = for
    a <- AdventureTable.find(c,id).flatMap(v => IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.npcs.exists(n => n.id=="merchant" && n.place==a.place && n.condition==NpcCondition.healthy) then IO.unit else IO.raiseError(AppError(409,"旅商目前无法交易"))
  yield Rules.prices.toList.sortBy(_._1).map((id,price) => ShopItem(id,price,a.merchantStock.find(_.id==id).fold(0)(_.quantity)))
object GetShopAPIMessage:
  given Encoder[GetShopAPIMessage] = deriveEncoder
  given Decoder[GetShopAPIMessage] = deriveDecoder

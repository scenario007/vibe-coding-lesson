package services.game.api

import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.apiTypes.MapLocation
import services.game.tables.AdventureTable.AdventureTable
import services.game.utils.Locations

final case class GetMapAPIMessage(id: String) extends APIMessage[List[MapLocation]]:
  def plan(c: Connection): IO[List[MapLocation]] = for
    a <- AdventureTable.find(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    mineOpen=a.events.contains("获得矿洞通行许可") || a.events.contains("矿洞封锁已解除")
    places=List("gate"->"村口","clinic"->"诊所","forge"->"铁匠铺","hall"->"议事厅","forest"->"森林","mine"->"矿洞","camp"->"营地")
  yield places.map { (id,name) =>
    val current=id==a.place
    val open=id!="mine" || mineOpen || current
    MapLocation(id,name,current,if current || !open then None else Some(Locations.travelHours(a,id)),open,if open then None else Some("矿洞入口被封锁"))
  }
object GetMapAPIMessage:
  given Encoder[GetMapAPIMessage] = deriveEncoder
  given Decoder[GetMapAPIMessage] = deriveDecoder

package services.game.api

import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.apiTypes.{ScenePerson,SceneView}
import services.game.tables.AdventureTable.AdventureTable
import services.game.utils.Locations

final case class GetSceneAPIMessage(id: String) extends APIMessage[SceneView]:
  def plan(c: Connection): IO[SceneView] = for
    a <- AdventureTable.find(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    title=Locations.names.toMap.getOrElse(a.place,"未知地点")
    base=a.place match
      case "gate" => "木栅旁贴着封锁矿洞的告示。道路通向村庄、森林与山脚。"
      case "clinic" => "诊所里摆着干净的布、药瓶和病人的记录，空气中有淡淡的草药味。"
      case "forge" => "铁匠铺的炉火渐弱，工具、工单和未完成的物件仍留在原处。"
      case "hall" => "议事厅的长桌上摊着村庄账册与矿洞文件，窗外能望见村口。"
      case "forest" => "潮湿的树叶覆盖着小径，脚印与折断的枝条隐约通向山脚。"
      case "mine" => "矿道里有水滴落的回声，旧轨道伸向光线难以照到的深处。"
      case "camp" => "一处简单的营地靠近小路，火塘和避风处仍可辨认。"
      case _ => "这里暂时没有更多可辨认的细节。"
    fog=if a.hour>=57 then " 黑雾已经逼近村庄，空气中的刺激气味愈发明显。" else if a.hour>=33 then " 远处的黑雾正在向村庄外围蔓延。" else ""
    people=a.npcs.filter(_.place==a.place).map(n=>ScenePerson(n.id,n.name,n.condition,n.met))
  yield SceneView(a.place,title,base+fog,people)
object GetSceneAPIMessage:
  given Encoder[GetSceneAPIMessage] = deriveEncoder
  given Decoder[GetSceneAPIMessage] = deriveDecoder

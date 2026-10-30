package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.NoRequestMessage
import services.game.objects.RoleOption
import services.game.tables.StoryProgressTable.StoryProgressTable
final case class ListRolesAPIMessage() extends NoRequestMessage[List[RoleOption]]:
  def plan(c: Connection): IO[List[RoleOption]] = StoryProgressTable.list(c).map { p =>
    List(RoleOption("流浪医师","熟悉药草和病症",true,"初始可选"),RoleOption("前矿工","了解矿道和工具",true,"初始可选"),RoleOption("调查员","擅长整理证词",true,"初始可选"),RoleOption("商队向导","熟悉道路和交易",p.exists(_._2),"完成任意一条主线结局，包括失败结局"))
  }
object ListRolesAPIMessage:
  given Encoder[ListRolesAPIMessage] = deriveEncoder
  given Decoder[ListRolesAPIMessage] = deriveDecoder

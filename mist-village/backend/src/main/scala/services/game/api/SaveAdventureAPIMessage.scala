package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.*
import services.game.tables.AdventureTable.AdventureTable
import services.game.utils.Locations
final case class SaveAdventureAPIMessage(id: String, slot: Int, confirmOverwrite: Option[Boolean]) extends APIMessage[AdventureView]:
  def plan(c: Connection): IO[AdventureView] = for
    _ <- if slot>=1 && slot<=3 then IO.unit else IO.raiseError(AppError(400,"手动存档位必须为 1 至 3"))
    a <- AdventureTable.findForUpdate(c,id).flatMap(v => IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.aiPause.nonEmpty then IO.raiseError(AppError(409,"请先重试失败的 AI 请求")) else IO.unit
    _ <- if a.battle.nonEmpty then IO.raiseError(AppError(409,"请先完成当前遭遇")) else IO.unit
    _ <- if a.pendingRecovery.nonEmpty then IO.raiseError(AppError(409,"请先处理当前危险的后果")) else IO.unit
    _ <- if a.dead then IO.raiseError(AppError(409,"角色已死亡，请读取存档")) else IO.unit
    _ <- if a.sealedEnding then IO.raiseError(AppError(409,"档案已封存")) else IO.unit
    _ <- if Locations.safe(a) then IO.unit else IO.raiseError(AppError(409,"当前位置不是确认安全的存档地点"))
    existing <- AdventureTable.load(c,id,slot)
    _ <- if existing.nonEmpty && !confirmOverwrite.contains(true) then IO.raiseError(AppError(409,"覆盖已有存档需要确认")) else IO.unit
    _ <- AdventureTable.save(c,a,slot)
  yield AdventureView.from(a)
object SaveAdventureAPIMessage:
  given Encoder[SaveAdventureAPIMessage] = deriveEncoder
  given Decoder[SaveAdventureAPIMessage] = deriveDecoder

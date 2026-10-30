package services.game.api
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.{AdventureView,ResolutionPlan}
import services.game.tables.AdventureTable.AdventureTable
import services.game.tables.StoryProgressTable.StoryProgressTable
final case class ExecuteResolutionAPIMessage(id: String, proposal: ResolutionPlan, confirmed: Boolean) extends APIMessage[AdventureView]:
  def plan(c: Connection): IO[AdventureView] = for
    _ <- if confirmed then IO.unit else IO.raiseError(AppError(400,"该方案可能结束本局，请确认"))
    a <- AdventureTable.findForUpdate(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.dead || a.sealedEnding || a.battle.nonEmpty || a.pendingRecovery.nonEmpty || a.aiPause.nonEmpty then IO.raiseError(AppError(409,"当前不能实施方案")) else IO.unit
    _ <- if a.aiEnabled then IO.unit else IO.raiseError(AppError(409,"本局未开启 AI 动态玩法"))
    result <- IO.fromEither(CustomResolution.execute(a,proposal))
    (next,success)=result
    _ <- AdventureTable.update(c,next)
    _ <- if next.stage!=a.stage then AdventureTable.save(c,next,0).void else IO.unit
    _ <- RecordOutcome(c,a,next,success)
    _ <- if next.sealedEnding && next.mode=="standard" then StoryProgressTable.record(c,next.truth,success).void else IO.unit
  yield AdventureView.from(next)
object ExecuteResolutionAPIMessage:
  given Encoder[ExecuteResolutionAPIMessage] = deriveEncoder
  given Decoder[ExecuteResolutionAPIMessage] = deriveDecoder

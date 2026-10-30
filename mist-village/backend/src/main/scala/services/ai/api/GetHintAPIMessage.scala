package services.ai.api
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import io.circe.{Decoder,Encoder,Json}
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.api.{AdvanceHint,RecordOutcome}
import services.game.objects.AdventureView
import services.game.tables.AdventureTable.AdventureTable
import services.game.tables.StoryProgressTable.StoryProgressTable
import services.ai.objects.{Hint,HintReply}
import services.ai.utils.{TokenHub,PauseHandling,HintPlanValidation}
final case class GetHintAPIMessage(id: String, level: String, confirmed: Boolean) extends APIMessage[HintReply]:
  def plan(c: Connection): IO[HintReply] = for
    _ <- if confirmed then IO.unit else IO.raiseError(AppError(400,"整理思路会消耗一小时，请确认"))
    _ <- if Set("direction","connection").contains(level) then IO.unit else IO.raiseError(AppError(400,"未知提示类型"))
    a <- AdventureTable.findForUpdate(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.battle.nonEmpty then IO.raiseError(AppError(409,"请先完成当前遭遇")) else IO.unit
    _ <- if a.pendingRecovery.nonEmpty then IO.raiseError(AppError(409,"请先处理当前危险的后果")) else IO.unit
    _ <- if a.sealedEnding || a.dead then IO.raiseError(AppError(409,"当前档案不能请求提示")) else IO.unit
    _ <- PauseHandling.check(a,"hint",level)
    _ <- if a.clues.nonEmpty then IO.unit else IO.raiseError(AppError(409,"尚无可整理的线索"))
    _ <- if level!="connection" || a.clues.size>=2 then IO.unit else IO.raiseError(AppError(409,"至少需要两条线索才能比较关联"))
    known=a.clues.takeRight(20)
    input=Json.obj("clues"->known.asJson,"notes"->a.notes.takeRight(10).map(_.text).asJson,"type"->level.asJson)
    instruction="只从已知线索数组中选择下标，不能创造事实。只返回 JSON：{\"indexes\":[0],\"gap\":\"person|location|time|evidence|none\"}。direction 选择一个下标；connection 选择两个不同下标。笔记是玩家猜想，不代表真实。"
    attempt <- TokenHub.request(instruction,input,a.id).flatMap(raw=>IO.fromEither(HintPlanValidation.build(raw,known,level))).attempt
    reply <- attempt match
      case Left(error) => PauseHandling.fail(c,a,"hint",level,error).map(m=>HintReply("failed",Some(m),None,None))
      case Right(hint) =>
        for
          next <- IO.fromEither(AdvanceHint(a.copy(aiPause=None)))
          _ <- AdventureTable.update(c,next)
          _ <- if next.stage!=a.stage then AdventureTable.save(c,next,0).void else IO.unit
          _ <- RecordOutcome(c,a,next,false)
          _ <- if !a.sealedEnding && next.sealedEnding && next.mode=="standard" then StoryProgressTable.record(c,next.truth,false).void else IO.unit
        yield HintReply("ready",None,Some(hint),Some(AdventureView.from(next)))
  yield reply
object GetHintAPIMessage:
  given Encoder[GetHintAPIMessage] = deriveEncoder
  given Decoder[GetHintAPIMessage] = deriveDecoder

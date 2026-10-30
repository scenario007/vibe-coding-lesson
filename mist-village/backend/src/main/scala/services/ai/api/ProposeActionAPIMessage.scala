package services.ai.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.tables.AdventureTable.AdventureTable
import services.game.api.ValidateAction
import services.game.objects.Adventure
import services.ai.objects.ActionProposal
import services.ai.objects.ProposalReply
import services.ai.utils.{TokenHub,PauseHandling}
final case class ProposeActionAPIMessage(id: String, input: String) extends APIMessage[ProposalReply]:
  def plan(c: Connection): IO[ProposalReply] = for
    _ <- if input.trim.nonEmpty && input.length<=500 then IO.unit else IO.raiseError(AppError(400,"行动描述应为 1 至 500 字"))
    a <- AdventureTable.findForUpdate(c,id).flatMap(v => IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.battle.nonEmpty then IO.raiseError(AppError(409,"请先完成当前遭遇")) else IO.unit
    _ <- if a.pendingRecovery.nonEmpty then IO.raiseError(AppError(409,"请先处理当前危险的后果")) else IO.unit
    _ <- if a.dead || a.sealedEnding then IO.raiseError(AppError(409,"当前档案不能继续")) else IO.unit
    _ <- if a.aiEnabled then IO.unit else IO.raiseError(AppError(409,"本局未开启 AI 动态玩法"))
    _ <- PauseHandling.check(a,"action",input)
    attempt <- TokenHub.propose(a.id,input,a.place,a.clues).attempt
    reply <- attempt match
      case Left(error) => PauseHandling.fail(c,a,"action",input,error).map(m=>ProposalReply("failed",Some(m),None))
      case Right(proposal) =>
        val status=ProposeActionAPIMessage.status(a,proposal)
        val message=if status=="unsupported" then Some("目前没有能执行该想法的规则，可以换个办法。") else if status=="unavailable" then Some("这个行动在当前地点或局势下不可执行。") else None
        AdventureTable.update(c,a.copy(aiPause=None)).map(_=>ProposalReply(status,message,if status=="ready" then Some(proposal) else None))
  yield reply
object ProposeActionAPIMessage:
  private[ai] def status(a: Adventure, proposal: ActionProposal): String =
    if proposal.action=="unknown" then "unsupported"
    else if ValidateAction.isApplicable(a,proposal.action) then "ready"
    else "unavailable"
  given Encoder[ProposeActionAPIMessage] = deriveEncoder
  given Decoder[ProposeActionAPIMessage] = deriveDecoder

package services.ai.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.tables.AdventureTable.AdventureTable
import services.game.api.ValidateAction
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
    attempt <- (for
      proposal <- TokenHub.propose(a.id,input,a.place,a.clues)
      _ <- if proposal.action == "unknown" || ValidateAction.isApplicable(a,proposal.action) then IO.unit else IO.raiseError(AppError(422,"AI 建议在当前局势不可执行，请重试"))
    yield proposal).attempt
    reply <- attempt match
      case Left(error) => PauseHandling.fail(c,a,"action",input,error).map(m=>ProposalReply("failed",Some(m),None))
      case Right(proposal) => AdventureTable.update(c,a.copy(aiPause=None)).map(_=>ProposalReply("ready",None,Some(proposal)))
  yield reply
object ProposeActionAPIMessage:
  given Encoder[ProposeActionAPIMessage] = deriveEncoder
  given Decoder[ProposeActionAPIMessage] = deriveDecoder

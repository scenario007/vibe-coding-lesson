package services.game.api
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.*
import services.game.tables.AdventureTable.AdventureTable
import services.game.tables.StoryProgressTable.StoryProgressTable
import services.game.utils.Rules
import services.ai.api.GenerateQuestAPIMessage
final case class PerformActionAPIMessage(id: String, action: String, confirmed: Option[Boolean]) extends APIMessage[ActionResult]:
  def plan(c: Connection): IO[ActionResult] = for
    _ <- if (action.startsWith("resolve:") || action.startsWith("harm:") || action.startsWith("kill:")) && !confirmed.contains(true) then IO.raiseError(AppError(400,"此行动可能造成不可逆后果，请确认")) else IO.unit
    a <- AdventureTable.findForUpdate(c,id).flatMap(v => IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.aiPause.nonEmpty then IO.raiseError(AppError(409,"请先重试失败的 AI 请求")) else IO.unit
    outcome <- IO.fromEither(Rules.perform(a,action))
    (intermediate,message,die,modifier,difficulty) = outcome
    rewarded = Rules.applyQuestRewards(a,intermediate,action,die,modifier,difficulty)
    newEvidence=rewarded.clues.filterNot(c=>rewarded.evidence.exists(_.text==c)).map(c=>Evidence.fromText(c,Some(rewarded.hour)))
    recorded=rewarded.copy(evidence=rewarded.evidence ++ newEvidence)
    stats=recorded.stats.getOrElse(PlayerStats.forRole(recorded.role))
    next=if recorded.stage>a.stage && recorded.stage<3 then recorded.copy(stats=Some(stats.copy(growthPoints=stats.growthPoints+1))) else recorded
    auto=next.stage>=1 && next.stage<3 && !next.generatedStages.contains(next.stage) && GenerateQuestAPIMessage.canGenerate(next)
    prepared=if auto then next.copy(generatedStages=next.generatedStages :+ next.stage) else next
    _ <- AdventureTable.update(c,prepared)
    success=action.startsWith("resolve:") && !prepared.events.contains("黑雾扩散失控，村庄被迫撤离。")
    _ <- RecordOutcome(c,a,prepared,success)
    _ <- if !a.sealedEnding && prepared.sealedEnding && prepared.mode == "standard" then StoryProgressTable.record(c,prepared.truth,success).void else IO.unit
    _ <- if auto then GenerateQuestAPIMessage(id).plan(c).void else IO.unit
    finalState <- if auto then AdventureTable.find(c,id).flatMap(v=>IO.fromOption(v)(AppError(500,"自动事件状态不可用"))) else IO.pure(prepared)
    _ <- if finalState.stage != a.stage then AdventureTable.save(c,finalState,0).void else IO.unit
    expired= !a.sealedEnding && finalState.sealedEnding && finalState.events.contains("黑雾扩散失控，村庄被迫撤离。")
    outcomeMessage=if expired && !(message.contains("黑雾") && message.contains("失控")) then message+" 黑雾扩散失控，村庄被迫撤离。" else message
    displayed=if auto && finalState.aiPause.nonEmpty then outcomeMessage+" AI 事件生成失败，请手动重试。" else outcomeMessage
  yield ActionResult(AdventureView.from(finalState),displayed,die,modifier,difficulty,Rules.unknownFactor(a,action))
object PerformActionAPIMessage:
  given Encoder[PerformActionAPIMessage] = deriveEncoder
  given Decoder[PerformActionAPIMessage] = deriveDecoder

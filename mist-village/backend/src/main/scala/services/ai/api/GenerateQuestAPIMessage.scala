package services.ai.api
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import io.circe.{Decoder,Encoder,Json}
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.{Adventure,AdventureView,Quest,QuestStatus,NpcCondition}
import services.game.tables.AdventureTable.AdventureTable
import services.ai.objects.QuestReply
import services.ai.utils.{TokenHub,QuestPlanValidation,PauseHandling}
final case class GenerateQuestAPIMessage(id: String) extends APIMessage[QuestReply]:
  def plan(c: Connection): IO[QuestReply] = for
    a <- AdventureTable.findForUpdate(c,id).flatMap(v => IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.battle.nonEmpty then IO.raiseError(AppError(409,"请先完成当前遭遇")) else IO.unit
    _ <- if a.pendingRecovery.nonEmpty then IO.raiseError(AppError(409,"请先处理当前危险的后果")) else IO.unit
    _ <- if a.dead || a.sealedEnding then IO.raiseError(AppError(409,"当前档案不能继续")) else IO.unit
    _ <- if a.aiEnabled then IO.unit else IO.raiseError(AppError(409,"本局未开启 AI 动态玩法"))
    _ <- PauseHandling.check(a,"quest","")
    met=a.npcs.filter(n => n.met && n.place == a.place && n.condition == NpcCondition.healthy)
    _ <- if met.nonEmpty then IO.unit else IO.raiseError(AppError(409,"先在当前位置与一名村民交谈"))
    _ <- if a.quests.count(_.status==QuestStatus.active)<3 && !a.quests.exists(_.status==QuestStatus.offered) then IO.unit else IO.raiseError(AppError(409,"当前进行中的请求已满或已有待接受请求"))
    existingGoals=a.quests.flatMap(_.goal).toSet
    goalFacts=Map("inspect_gate" -> "封锁告示：矿洞因安全事故关闭。", "read_report" -> "矿洞报告：事故前曾出现异常警报。", "search_forest" -> "森林足迹：有人近期从森林走向矿洞。")
    goals=goalFacts.toList.filterNot { case (goal,clue) => existingGoals.contains(goal) || a.clues.contains(clue) }.map(_._1).sorted
    _ <- if goals.nonEmpty then IO.unit else IO.raiseError(AppError(409,"暂时没有可用的调查方向"))
    data=Json.obj("hour" -> a.hour.asJson,"place" -> a.place.asJson,"clues" -> a.clues.takeRight(10).asJson,"recentEvents" -> a.events.takeRight(8).asJson,"background" -> a.profile.map(_.background).asJson,"knownNpcs" -> met.map(n=>Json.obj("id"->n.id.asJson,"name"->n.name.asJson,"facts"->n.facts.takeRight(5).map(_.text).asJson)).asJson,"goals" -> goals.asJson)
    instructions="根据已知情形提出调查请求，只返回 JSON：{\"goal\":\"从 goals 选择\",\"issuer\":\"从 knownNpcs 选择 id\",\"reward\":\"trust、recovery 或 filter\",\"reasonIndex\":null 或该人物 facts 数组的下标}。理由只能引用该人物已有 facts；没有合适理由则为 null。不能捏造事实。"
    attempt <- TokenHub.request(instructions,data,a.id).flatMap(raw=>IO.fromEither(QuestPlanValidation.parse(raw,goals,met.map(_.id).toSet,met.map(n=>n.id->n.facts.takeRight(5).size).toMap))).attempt
    reply <- attempt match
      case Left(error) => PauseHandling.fail(c,a,"quest","",error).map(m=>QuestReply("failed",Some(m),None))
      case Right(plan) =>
        val issuer=met.find(_.id==plan.issuer).get
        val description=plan.goal match
          case "inspect_gate" => s"${issuer.name}请你查看村口封锁告示。"
          case "read_report" => s"${issuer.name}请你到议事厅检查矿洞报告。"
          case _ => s"${issuer.name}请你到森林寻找矿工的踪迹。"
        val reason=plan.reasonIndex.map(i=>issuer.facts.takeRight(5)(i).text)
        val rewardText=if plan.reward=="trust" then "对方会更加信任你。" else if plan.reward=="filter" then "完成后可获得净水滤芯，用于保护水源。" else "完成后可恢复少量生命。"
        val title=plan.goal match
          case "inspect_gate" => "调查村口封锁"
          case "read_report" => "调查矿洞报告"
          case _ => "寻找森林踪迹"
        for
          questId <- IO(UUID.randomUUID().toString)
          q=Quest(questId,title,QuestStatus.offered,Some(a.hour+24),description+reason.map(r=>s"对方提及：$r").getOrElse("")+rewardText+"如果对方不在现场，需要在期限内当面汇报。",Some(plan.goal),Some(plan.issuer),Some(plan.reward))
          updatedNpcs=a.npcs.map(n=>if n.id==issuer.id then n.copy(memories=n.memories ++ reason.map(r=>s"对方向玩家提及：$r")) else n)
          next=a.copy(quests=a.quests :+ q,npcs=updatedNpcs,events=a.events :+ s"${issuer.name}提出一项调查请求",aiPause=None)
          _ <- AdventureTable.update(c,next)
          snapshot <- AdventureTable.load(c,id,0)
          _ <- snapshot match
            case Some(saved) if saved.aiPause.exists(_.kind=="quest") && saved.stage==a.stage && saved.generatedStages==a.generatedStages => AdventureTable.save(c,next,0).void
            case _ => IO.unit
        yield QuestReply("ready",None,Some(AdventureView.from(next)))
  yield reply
object GenerateQuestAPIMessage:
  def canGenerate(a: Adventure): Boolean =
    val open=a.quests.count(_.status==QuestStatus.active)<3 && !a.quests.exists(_.status==QuestStatus.offered)
    val person=a.npcs.exists(n=>n.met && n.place==a.place && n.condition==NpcCondition.healthy)
    val used=a.quests.flatMap(_.goal).toSet
    val facts=Map("inspect_gate"->"封锁告示：矿洞因安全事故关闭。","read_report"->"矿洞报告：事故前曾出现异常警报。","search_forest"->"森林足迹：有人近期从森林走向矿洞。")
    val goal=facts.exists((id,clue)=> !used.contains(id) && !a.clues.contains(clue))
    a.aiEnabled && !a.dead && !a.sealedEnding && a.aiPause.isEmpty && a.battle.isEmpty && a.pendingRecovery.isEmpty && open && person && goal
  given Encoder[GenerateQuestAPIMessage] = deriveEncoder
  given Decoder[GenerateQuestAPIMessage] = deriveDecoder

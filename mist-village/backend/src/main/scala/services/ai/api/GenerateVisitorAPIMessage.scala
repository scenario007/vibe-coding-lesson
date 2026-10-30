package services.ai.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder,Json}
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.{AdventureView,NpcState,NpcCondition}
import services.game.tables.AdventureTable.AdventureTable
import services.ai.objects.QuestReply
import services.ai.utils.{TokenHub,VisitorValidation,PauseHandling}
final case class GenerateVisitorAPIMessage(id: String) extends APIMessage[QuestReply]:
  def plan(c: Connection): IO[QuestReply] = for
    a <- AdventureTable.findForUpdate(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.dead || a.sealedEnding || a.battle.nonEmpty || a.pendingRecovery.nonEmpty then IO.raiseError(AppError(409,"当前不能生成事件")) else IO.unit
    _ <- if a.aiEnabled && a.stage>=1 then IO.unit else IO.raiseError(AppError(409,"本局未开启 AI 动态玩法或故事尚未推进"))
    _ <- PauseHandling.check(a,"visitor","")
    visitors=a.npcs.filter(_.id.startsWith("visitor:"))
    _ <- if visitors.size<2 then IO.unit else IO.raiseError(AppError(409,"本局新人物已达上限"))
    met=a.npcs.filter(n=>n.met && n.place==a.place && n.condition==NpcCondition.healthy)
    contacts=met.map(_.id).toSet
    used=visitors.map(_.id.stripPrefix("visitor:")).toSet
    available=Map("courier"->Set("merchant","guard"),"apprentice"->Set("healer","smith"),"woodcutter"->Set("guard","mia")).filter((kind,ids)=> !used.contains(kind) && ids.exists(contacts.contains))
    _ <- if available.nonEmpty then IO.unit else IO.raiseError(AppError(409,"当前没有能引荐新人物的熟人"))
    input=Json.obj("place"->a.place.asJson,"clues"->a.clues.takeRight(10).asJson,"options"->available.asJson)
    prompt="根据当前村庄情况选择一个新人物，只返回 JSON：{\"kind\":\"options 中的一种\",\"contact\":\"该种对应数组中的一个 id\"}。不能虚构秘密、伤亡或额外人物。"
    attempt <- TokenHub.request(prompt,input,a.id).flatMap(raw=>IO.fromEither(VisitorValidation.parse(raw,contacts,used))).attempt
    reply <- attempt match
      case Left(error) => PauseHandling.fail(c,a,"visitor","",error).map(m=>QuestReply("failed",Some(m),None))
      case Right(plan) =>
        val name=Map("courier"->"货运员林","apprentice"->"学徒陈","woodcutter"->"樵夫周")(plan.kind)
        val contact=met.find(_.id==plan.contact).get
        val visitor=NpcState(s"visitor:${plan.kind}",name,a.place,50,false,Nil,"",contacts=List(plan.contact))
        val next=a.copy(npcs=a.npcs :+ visitor,events=a.events :+ s"${contact.name}介绍了$name。",aiPause=None)
        AdventureTable.update(c,next).map(_=>QuestReply("ready",None,Some(AdventureView.from(next))))
  yield reply
object GenerateVisitorAPIMessage:
  given Encoder[GenerateVisitorAPIMessage] = deriveEncoder
  given Decoder[GenerateVisitorAPIMessage] = deriveDecoder

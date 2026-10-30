package services.ai.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder,Json}
import io.circe.generic.semiauto.*
import io.circe.parser.decode
import io.circe.syntax.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.api.CustomResolution
import services.game.objects.ResolutionPlan
import services.game.tables.AdventureTable.AdventureTable
import services.ai.objects.ResolutionReply
import services.ai.utils.{TokenHub,PauseHandling}
final case class ProposeResolutionAPIMessage(id: String, input: String) extends APIMessage[ResolutionReply]:
  def plan(c: Connection): IO[ResolutionReply] = for
    _ <- if input.trim.nonEmpty && input.length<=500 then IO.unit else IO.raiseError(AppError(400,"方案描述应为 1 至 500 字"))
    a <- AdventureTable.findForUpdate(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.dead || a.sealedEnding || a.battle.nonEmpty || a.pendingRecovery.nonEmpty then IO.raiseError(AppError(409,"当前不能制定最终方案")) else IO.unit
    _ <- if a.aiEnabled then IO.unit else IO.raiseError(AppError(409,"本局未开启 AI 动态玩法"))
    _ <- PauseHandling.check(a,"resolution",input)
    knownPeople=a.npcs.filter(n=>n.met && n.place==a.place).map(n=>Json.obj("id"->n.id.asJson,"name"->n.name.asJson,"trust"->n.knownTrust.asJson))
    data=Json.obj("proposal"->input.asJson,"stage"->a.stage.asJson,"clues"->a.clues.asJson,"items"->a.items.asJson,"peopleHere"->knownPeople.asJson)
    instruction="将玩家的危机解决想法映射为现有规则，不允许创造事实或物品。仅返回 JSON：{\"method\":\"evacuate|contain|water|unsupported\",\"support\":\"supplies|oil|person|none\",\"person\":null 或人物 id}。evacuate 可用 supplies 或 person(guard)；contain 可用 oil 或 person(smith/guard)；water 可用 oil 或 person(healer/smith)。不能合理匹配时 method 为 unsupported、support 为 none、person 为 null。"
    attempt <- (for
      raw <- TokenHub.request(instruction,data,a.id)
      plan <- IO.fromEither(decode[ResolutionPlan](raw).left.map(_=>AppError(502,"方案格式无效")))
      _ <- if CustomResolution.validShape(plan) then IO.unit else IO.raiseError(AppError(502,"方案组合未通过规则检查"))
    yield plan).attempt
    reply <- attempt match
      case Left(error) => PauseHandling.fail(c,a,"resolution",input,error).map(m=>ResolutionReply("failed",Some(m),None))
      case Right(p) if p.method=="unsupported" && p.support=="none" && p.person.isEmpty => AdventureTable.update(c,a.copy(aiPause=None)).map(_=>ResolutionReply("unsupported",Some("目前没有能执行该想法的规则，可以换个办法。"),None))
      case Right(p) => CustomResolution.preview(a,p) match
        case Left(error) => AdventureTable.update(c,a.copy(aiPause=None)).map(_=>ResolutionReply("unavailable",Some(error.message),None))
        case Right(preview) => AdventureTable.update(c,a.copy(aiPause=None)).map(_=>ResolutionReply("ready",None,Some(preview)))
  yield reply
object ProposeResolutionAPIMessage:
  given Encoder[ProposeResolutionAPIMessage] = deriveEncoder
  given Decoder[ProposeResolutionAPIMessage] = deriveDecoder

package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.TruthReveal
import services.game.tables.AdventureTable.AdventureTable
import services.game.tables.StoryProgressTable.StoryProgressTable
final case class RevealTruthAPIMessage(id: String) extends APIMessage[TruthReveal]:
  def plan(c: Connection): IO[TruthReveal] = for
    a <- AdventureTable.find(c,id).flatMap(v => IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.sealedEnding && a.stage == 3 then IO.unit else IO.raiseError(AppError(409,"主线尚未结束，真相不可查看"))
    truth <- a.truth match
      case "mine_accident" => IO.pure(TruthReveal("矿难隐瞒","矿洞开采损坏地下结构，有害气体泄漏；有关安全风险的报告曾被压下。"))
      case "chemical_accident" => IO.pure(TruthReveal("药剂事故","污染处理药剂流入地下，与地下物质反应后形成黑雾；事故记录不完整。"))
      case _ => IO.raiseError(AppError(500,"本局真相数据无效"))
    _ <- if a.mode=="standard" then StoryProgressTable.markViewed(c,a.truth) else IO.pure(0)
    details=a.challengeTruth.map { plan =>
      val name=Map("mayor"->"村长伊芙","smith"->"铁匠阿岚","guard"->"守卫罗恩","healer"->"药师林婆").getOrElse(plan.involvedNpc,"相关人士")
      val awareness=if plan.knowledge=="aware" then "知道存在风险" else "当时没有意识到风险"
      val motive=Map("economic"->"考虑到生计与经济压力","safety"->"出于对安全的担忧","oversight"->"由于疏忽").getOrElse(plan.motive,"")
      s"涉及人物：$name；此人$awareness，行动原因是$motive。"
    }.getOrElse("")
  yield truth.copy(explanation=truth.explanation+details)
object RevealTruthAPIMessage:
  given Encoder[RevealTruthAPIMessage] = deriveEncoder
  given Decoder[RevealTruthAPIMessage] = deriveDecoder

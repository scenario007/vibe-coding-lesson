package services.game.api
import cats.effect.IO
import java.sql.Connection
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.system.api.APIMessage
import services.system.objects.AppError
import services.game.objects.*
import services.game.tables.AdventureTable.AdventureTable
import services.game.utils.GrowthRules
final case class SpendGrowthAPIMessage(id: String, choice: String) extends APIMessage[AdventureView]:
  def plan(c: Connection): IO[AdventureView] = for
    a <- AdventureTable.findForUpdate(c,id).flatMap(v=>IO.fromOption(v)(AppError(404,"档案不存在")))
    _ <- if a.aiPause.nonEmpty then IO.raiseError(AppError(409,"请先重试失败的 AI 请求")) else IO.unit
    _ <- if a.battle.nonEmpty then IO.raiseError(AppError(409,"请先完成当前遭遇")) else IO.unit
    _ <- if a.pendingRecovery.nonEmpty then IO.raiseError(AppError(409,"请先处理当前危险的后果")) else IO.unit
    _ <- if a.dead || a.sealedEnding then IO.raiseError(AppError(409,"当前档案不能成长")) else IO.unit
    stats=a.stats.getOrElse(PlayerStats.forRole(a.role))
    _ <- if stats.growthPoints>0 then IO.unit else IO.raiseError(AppError(409,"没有可用成长机会"))
    option <- IO.fromOption(GrowthRules.options(a).find(_.id==choice))(AppError(400,"未知成长选项"))
    _ <- if option.available then IO.unit else IO.raiseError(AppError(409,option.reason.getOrElse("该成长选项不可用")))
    nextStats=choice match
      case "body" => stats.copy(body=stats.body+1,growthPoints=stats.growthPoints-1)
      case "agility" => stats.copy(agility=stats.agility+1,growthPoints=stats.growthPoints-1)
      case "insight" => stats.copy(insight=stats.insight+1,growthPoints=stats.growthPoints-1)
      case "social" => stats.copy(social=stats.social+1,growthPoints=stats.growthPoints-1)
      case _ => stats.copy(talents=stats.talents :+ choice,growthPoints=stats.growthPoints-1)
    next=a.copy(stats=Some(nextStats),events=a.events :+ s"获得成长：$choice")
    _ <- AdventureTable.update(c,next)
  yield AdventureView.from(next)
object SpendGrowthAPIMessage:
  given Encoder[SpendGrowthAPIMessage] = deriveEncoder
  given Decoder[SpendGrowthAPIMessage] = deriveDecoder

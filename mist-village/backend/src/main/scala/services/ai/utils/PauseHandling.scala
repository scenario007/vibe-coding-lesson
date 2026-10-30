package services.ai.utils
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.game.objects.{Adventure,AiPause}
import services.game.tables.AdventureTable.AdventureTable
import services.system.objects.AppError
private[ai] object PauseHandling:
  private[ai] def check(a: Adventure, kind: String, input: String): IO[Unit] = a.aiPause match
    case None => IO.unit
    case Some(p) if p.kind==kind && (p.input==input || kind=="action" || kind=="resolution") => IO.unit
    case _ => IO.raiseError(AppError(409,"请先重试上一次失败的 AI 请求"))
  private[ai] def fail(c: Connection,a: Adventure,kind: String,input: String,error: Throwable): IO[String] =
    val message=error match
      case e: AppError => e.message
      case _ => "AI 服务暂时不可用，请检查连接和配置后手动重试。"
    AdventureTable.update(c,a.copy(aiPause=Some(AiPause(kind,input,message)))).as(message)

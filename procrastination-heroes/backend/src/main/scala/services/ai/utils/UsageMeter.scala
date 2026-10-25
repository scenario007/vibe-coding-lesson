package services.ai.utils
import cats.effect.IO
import cats.syntax.all.*
import io.circe.Json
import services.ai.objects.*
import services.ai.tables.usageEvent.UsageEventTable
import services.system.api.DatabaseSession
import services.system.objects.AppError
private[ai] object UsageMeter:
  private[ai] def budget: BigDecimal = scala.util.Try(BigDecimal(sys.env.getOrElse("TOKENHUB_ROUND_BUDGET_CNY","10"))).toOption.filter(v=>v>=0 && v<=10).getOrElse(BigDecimal(0))
  private[ai] def reserve(job: GenerationJob, model: String, payloadBytes: Int, now: Long): IO[Unit] =
    for
      _ <- if model=="deepseek-v4.1-flash" then IO.unit else IO.raiseError(AppError(503,"当前文本模型没有已核实的费用规则，已停止调用"))
      quote = UsagePricing.quote(payloadBytes)
      _ <- DatabaseSession.transaction { c =>
        for
          _ <- UsageEventTable.lock(c)
          assets <- AssetLedger.read
          totals <- UsageEventTable.totals(c)
          _ <- if totals.measuredCny+totals.heldCny+assets.map(_.estimatedCny).sum+quote<=budget then IO.unit else IO.raiseError(AppError(429,"本轮 AI 费用预算不足，已停止新增调用；请查看用量账本"))
          _ <- UsageEventTable.insert(c,UsageEvent(job.id,job.userId,model,UsageStatus.reserved,None,None,None,quote,None,None,now))
        yield ()
      }
    yield ()
  private[ai] def settle(job: GenerationJob, json: Option[Json], started: Long, ended: Long): IO[Unit] =
    val tokens=json.flatMap(UsagePricing.reading)
    val cost=tokens.map(v=>UsagePricing.estimate(v,started,ended))
    val requestId=json.flatMap(v=>v.hcursor.get[String]("id").toOption.orElse(v.hcursor.get[String]("request_id").toOption))
    DatabaseSession.transaction(c=>UsageEventTable.settle(c,job.id,tokens,cost,requestId)).void

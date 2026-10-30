package services.ai.utils
import cats.effect.{IO,Resource}
import cats.syntax.all.*
import java.sql.{Connection,DriverManager}
import java.nio.file.{Files,Path}
import java.time.{Instant,ZoneId,DayOfWeek}
import io.circe.Json
import io.circe.parser.parse
import services.ai.tables.SharedUsageTable.{SharedUsageTable,SharedUsageTableInitializer}
import services.system.objects.AppError
import services.ai.objects.UsageReport

private[ai] object SharedLedger:
  private def required(name: String): IO[String] = IO.fromOption(sys.env.get(name).filter(_.nonEmpty))(AppError(503,s"共享用量账本缺少配置：$name"))
  private def transaction[A](f: Connection => IO[A]): IO[A] = for
    url <- required("MIST_LEDGER_JDBC_URL")
    user <- required("MIST_LEDGER_DB_USER")
    password <- IO.pure(sys.env.getOrElse("MIST_LEDGER_DB_PASSWORD",""))
    result <- Resource.fromAutoCloseable(IO.blocking(DriverManager.getConnection(url,user,password))).use { c =>
      IO.blocking(c.setAutoCommit(false)) *> f(c).attempt.flatMap {
        case Right(v) => IO.blocking(c.commit()).as(v)
        case Left(e) => IO.blocking(c.rollback()).attempt *> IO.raiseError(e)
      }
    }
  yield result
  private def assets: IO[BigDecimal] = for
    file <- required("TOKENHUB_ART_MANIFEST")
    content <- IO.blocking(Files.readString(Path.of(file))).adaptError { case _ => AppError(503,"无法读取共享素材用量记录") }
    json <- IO.fromEither(parse(content).left.map(_ => AppError(503,"共享素材用量记录无效")))
    records <- IO.fromOption(json.hcursor.downField("assets").focus.flatMap(_.asArray))(AppError(503,"共享素材用量记录缺少 assets"))
    costs <- records.toList.traverse(v => IO.fromOption(v.hcursor.get[BigDecimal]("estimatedCny").toOption.filter(_>=0))(AppError(503,"共享素材费用缺失或无效，已停止新增调用")))
  yield costs.sum
  private def peak(at: Long): Boolean =
    val t=Instant.ofEpochMilli(at).atZone(ZoneId.of("Asia/Shanghai"))
    t.getDayOfWeek != DayOfWeek.SATURDAY && t.getDayOfWeek != DayOfWeek.SUNDAY && ((t.getHour>=9 && t.getHour<12) || (t.getHour>=14 && t.getHour<18))
  private[ai] def reserve(id: String, payloadBytes: Int, started: Long): IO[Unit] = for
    userId <- required("MIST_LEDGER_USER_ID")
    budgetText <- required("TOKENHUB_ROUND_BUDGET_CNY")
    budget <- IO.fromOption(scala.util.Try(BigDecimal(budgetText)).toOption.filter(v => v>=0 && v<=10))(AppError(503,"共享预算配置无效"))
    quote = BigDecimal(payloadBytes.toLong+1536)*2/1000000 + BigDecimal(384)*8/1000000
    _ <- transaction { c => for
      _ <- SharedUsageTable.lock(c)
      _ <- SharedUsageTableInitializer.verify(c)
      imageTotal <- assets
      total <- SharedUsageTable.total(c)
      _ <- if total + imageTotal + quote <= budget then IO.unit else IO.raiseError(AppError(429,"共享预算不足，未发送 AI 请求"))
      _ <- SharedUsageTable.insert(c,id,userId,quote,started)
    yield () }
  yield ()
  private[ai] def settle(id: String, response: Option[Json], started: Long, ended: Long): IO[Unit] =
    val usage=response.map(_.hcursor.downField("usage"))
    val tokens=for
      u <- usage
      in <- u.get[Long]("prompt_tokens").toOption.filter(_>=0)
      out <- u.get[Long]("completion_tokens").toOption.filter(_>=0)
      cached = u.downField("prompt_tokens_details").get[Long]("cached_tokens").toOption.orElse(u.get[Long]("cache_read_tokens").toOption).orElse(u.get[Long]("prompt_cache_hit_tokens").toOption).getOrElse(0L)
      if cached>=0 && cached<=in
    yield (in,out,cached)
    val cost=tokens.map { (in,out,cached) =>
      val high=peak(started)||peak(ended)
      (BigDecimal(in-cached)*(if high then BigDecimal(2) else BigDecimal(1))+BigDecimal(cached)*(if high then BigDecimal("0.04") else BigDecimal("0.02"))+BigDecimal(out)*(if high then BigDecimal(8) else BigDecimal(4)))/1000000
    }
    val requestId=response.flatMap(j => j.hcursor.get[String]("id").toOption.orElse(j.hcursor.get[String]("request_id").toOption))
    transaction(c=>SharedUsageTable.settle(c,id,tokens,cost,requestId)).void
  private[ai] def report(adventureId: String): IO[UsageReport] = transaction(c=>SharedUsageTable.report(c,adventureId))

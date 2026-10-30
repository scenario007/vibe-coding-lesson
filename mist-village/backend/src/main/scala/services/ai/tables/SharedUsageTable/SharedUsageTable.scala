package services.ai.tables.SharedUsageTable
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.tables.Jdbc
import services.ai.objects.UsageReport
object SharedUsageTable:
  private val lockSql="SELECT pg_advisory_xact_lock(7320182)"
  def lock(c: Connection): IO[Unit] = Jdbc.query(c,lockSql)(_=>()).void
  private val totalSql="SELECT COALESCE(SUM(estimated_cny),0)+COALESCE(SUM(CASE WHEN estimated_cny IS NULL THEN reserved_cny ELSE 0 END),0) AS total FROM ai_usage_events"
  def total(c: Connection): IO[BigDecimal] = Jdbc.query(c,totalSql)(r=>BigDecimal(r.getBigDecimal("total"))).map(_.head)
  private val insertSql="INSERT INTO ai_usage_events(id,user_id,model,status,reserved_cny,created_at) VALUES(?,?,?,'reserved',?,?)"
  def insert(c: Connection,id: String,userId: String,amount: BigDecimal,createdAt: Long): IO[Int] = Jdbc.update(c,insertSql,List(id,userId,"deepseek-v4.1-flash",amount.bigDecimal,createdAt))
  private val settleSql="UPDATE ai_usage_events SET status=?,input_tokens=?,output_tokens=?,cached_tokens=?,estimated_cny=?,request_id=? WHERE id=? AND status='reserved'"
  def settle(c: Connection,id: String,tokens: Option[(Long,Long,Long)],cost: Option[BigDecimal],requestId: Option[String]): IO[Int] = Jdbc.update(c,settleSql,List(if cost.nonEmpty then "measured" else "unconfirmed",tokens.map(v=>Long.box(v._1)).orNull,tokens.map(v=>Long.box(v._2)).orNull,tokens.map(v=>Long.box(v._3)).orNull,cost.map(_.bigDecimal).orNull,requestId.orNull,id))
  private val reportSql="""SELECT count(*) AS requests, COALESCE(SUM(input_tokens),0) AS input, COALESCE(SUM(output_tokens),0) AS output, COALESCE(SUM(estimated_cny),0) AS estimated, COUNT(*) FILTER (WHERE estimated_cny IS NULL) AS unknown, COALESCE(SUM(CASE WHEN estimated_cny IS NULL THEN reserved_cny ELSE 0 END),0) AS held FROM ai_usage_events WHERE id LIKE ?"""
  def report(c: Connection,adventureId: String): IO[UsageReport] = Jdbc.query(c,reportSql,List(s"mist:$adventureId:%"))(r=>UsageReport(r.getLong("requests"),r.getLong("input"),r.getLong("output"),BigDecimal(r.getBigDecimal("estimated")),r.getLong("unknown"),BigDecimal(r.getBigDecimal("held")))).map(_.head)

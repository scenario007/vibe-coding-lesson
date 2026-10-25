package services.ai.tables.usageEvent
import cats.effect.IO
import cats.syntax.all.*
import java.sql.{Connection,ResultSet}
import services.system.tables.Jdbc
import services.ai.objects.*
import services.users.objects.UserId
object UsageEventTable:
  private val lockSql="SELECT pg_advisory_xact_lock(7320182)"
  def lock(c: Connection): IO[Unit] = Jdbc.query(c,lockSql)(_=>()).void
  private val totalsSql="SELECT COALESCE(SUM(estimated_cny),0) AS spent,COALESCE(SUM(CASE WHEN estimated_cny IS NULL THEN reserved_cny ELSE 0 END),0) AS held,COALESCE(SUM(COALESCE(input_tokens,0)+COALESCE(output_tokens,0)),0)::bigint AS tokens FROM ai_usage_events"
  def totals(c: Connection): IO[UsageTotals] = Jdbc.query(c,totalsSql)(r=>UsageTotals(BigDecimal(r.getBigDecimal("spent")),BigDecimal(r.getBigDecimal("held")),r.getLong("tokens"))).map(_.head)
  private val insertSql="INSERT INTO ai_usage_events (id,user_id,model,status,reserved_cny,created_at) VALUES(?,?,?,?,?,?)"
  def insert(c: Connection,v: UsageEvent): IO[Int] = Jdbc.update(c,insertSql,List(v.id.value,v.userId.value,v.model,v.status.toString,v.reservedCny.bigDecimal,v.createdAt))
  private val settleSql="UPDATE ai_usage_events SET status=?,input_tokens=?,output_tokens=?,cached_tokens=?,estimated_cny=?,request_id=? WHERE id=? AND status='reserved'"
  def settle(c: Connection,id: JobId,tokens: Option[TokenReading],cost: Option[BigDecimal],requestId: Option[String]): IO[Int] =
    Jdbc.update(c,settleSql,List(if cost.nonEmpty then "measured" else "unconfirmed",tokens.map(v=>Long.box(v.input)).orNull,tokens.map(v=>Long.box(v.output)).orNull,tokens.map(v=>Long.box(v.cached)).orNull,cost.map(_.bigDecimal).orNull,requestId.orNull,id.value))
  private val listForUserSql="SELECT * FROM ai_usage_events WHERE user_id=? ORDER BY created_at DESC LIMIT 20"
  def listForUser(c: Connection,userId: UserId): IO[List[UsageEvent]] = Jdbc.query(c,listForUserSql,List(userId.value))(read)
  private val recoverSql="UPDATE ai_usage_events SET status='unconfirmed' WHERE status='reserved'"
  def recoverInterrupted(c: Connection): IO[Int] = Jdbc.update(c,recoverSql)
  private def read(r: ResultSet): UsageEvent =
    UsageEvent(JobId(r.getString("id")),UserId(r.getString("user_id")),r.getString("model"),UsageStatus.fromString(r.getString("status")).toOption.get,Option(r.getObject("input_tokens")).map(_=>r.getLong("input_tokens")),Option(r.getObject("output_tokens")).map(_=>r.getLong("output_tokens")),Option(r.getObject("cached_tokens")).map(_=>r.getLong("cached_tokens")),BigDecimal(r.getBigDecimal("reserved_cny")),Option(r.getBigDecimal("estimated_cny")).map(BigDecimal(_)),Option(r.getString("request_id")),r.getLong("created_at"))

package services.ai.tables.usageEvent
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object UsageEventTableInitializer:
  private val sql = """CREATE TABLE IF NOT EXISTS ai_usage_events (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),model TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('reserved','measured','unconfirmed')),input_tokens BIGINT,output_tokens BIGINT,cached_tokens BIGINT,reserved_cny NUMERIC(18,8) NOT NULL CHECK(reserved_cny>=0),estimated_cny NUMERIC(18,8),request_id TEXT,created_at BIGINT NOT NULL); ALTER TABLE ai_usage_events DROP CONSTRAINT IF EXISTS ai_usage_events_id_fkey"""
  def initialize(c: Connection): IO[Unit] = Jdbc.initialize(c,sql)

package services.focus.tables.focusSegment
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object FocusSegmentTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS focus_segments(id bigserial PRIMARY KEY,session_id text NOT NULL REFERENCES focus_sessions(id),started_at bigint NOT NULL,ended_at bigint NOT NULL CHECK(ended_at>=started_at),UNIQUE(session_id,started_at));"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

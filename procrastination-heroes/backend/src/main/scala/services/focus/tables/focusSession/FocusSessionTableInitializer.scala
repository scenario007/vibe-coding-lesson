package services.focus.tables.focusSession
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object FocusSessionTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS focus_sessions(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),step_id text REFERENCES quest_steps(id),target_seconds integer NOT NULL CHECK(target_seconds BETWEEN 60 AND 5400),status text NOT NULL,elapsed_seconds integer NOT NULL DEFAULT 0,running_since bigint,created_at bigint NOT NULL,ended_at bigint); CREATE UNIQUE INDEX IF NOT EXISTS one_active_focus ON focus_sessions(user_id) WHERE status IN ('running','paused');"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

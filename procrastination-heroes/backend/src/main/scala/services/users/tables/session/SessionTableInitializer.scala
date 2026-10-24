package services.users.tables.session
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object SessionTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS user_sessions(token_hash text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),expires_at bigint NOT NULL); CREATE INDEX IF NOT EXISTS session_user_idx ON user_sessions(user_id);"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

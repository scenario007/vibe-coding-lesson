package services.adventure.tables.progress
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object ProgressTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS player_progress(user_id text PRIMARY KEY REFERENCES users(id),experience integer NOT NULL DEFAULT 0 CHECK(experience>=0));"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

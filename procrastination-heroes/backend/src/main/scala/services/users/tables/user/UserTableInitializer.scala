package services.users.tables.user
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object UserTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS users(id text PRIMARY KEY,username varchar(40) UNIQUE NOT NULL,password_hash text NOT NULL,salt text NOT NULL,nickname varchar(40) NOT NULL,avatar text NOT NULL,daily_goal integer NOT NULL DEFAULT 3 CHECK(daily_goal BETWEEN 1 AND 20),focus_minutes integer NOT NULL DEFAULT 25 CHECK(focus_minutes IN (10,25,45)),created_at bigint NOT NULL);"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

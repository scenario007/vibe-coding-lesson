package services.economy.tables.taskReward
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object TaskRewardTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS task_rewards(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),quest_id text UNIQUE NOT NULL REFERENCES quests(id),unlocked_at bigint NOT NULL);"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

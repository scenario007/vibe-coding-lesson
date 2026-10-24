package services.economy.tables.rewardEvent
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object RewardEventTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS reward_events(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),quest_id text NOT NULL REFERENCES quests(id),step_id text UNIQUE NOT NULL REFERENCES quest_steps(id),coins integer NOT NULL CHECK(coins>=0),experience integer NOT NULL CHECK(experience>=0),reward_day text NOT NULL,created_at bigint NOT NULL); CREATE INDEX IF NOT EXISTS reward_day_idx ON reward_events(user_id,reward_day);"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

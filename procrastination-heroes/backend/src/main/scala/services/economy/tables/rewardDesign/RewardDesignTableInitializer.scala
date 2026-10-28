package services.economy.tables.rewardDesign
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object RewardDesignTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS reward_designs(id text PRIMARY KEY,quest_id text UNIQUE NOT NULL REFERENCES quests(id),name varchar(60) NOT NULL,story varchar(500) NOT NULL,symbol text NOT NULL,palette text NOT NULL,image_url text); ALTER TABLE reward_designs ADD COLUMN IF NOT EXISTS image_url text;"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

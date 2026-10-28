package services.quests.tables.quest
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object QuestTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS quests(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),title varchar(100) NOT NULL,category text NOT NULL,description text NOT NULL,due_date varchar(10),tier text NOT NULL CHECK(tier IN ('daily','challenge','long_term','small','normal','main')),status text NOT NULL CHECK(status IN ('draft','active','completed','archived')),archived_from text NOT NULL,version integer NOT NULL DEFAULT 1,reflection text NOT NULL DEFAULT '',created_at bigint NOT NULL,completed_at bigint); ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_tier_check; UPDATE quests SET tier='daily' WHERE tier='small'; UPDATE quests SET tier='challenge' WHERE tier='normal'; UPDATE quests SET tier='long_term' WHERE tier='main'; ALTER TABLE quests ADD CONSTRAINT quests_tier_check CHECK(tier IN ('daily','challenge','long_term')); CREATE INDEX IF NOT EXISTS quest_owner_idx ON quests(user_id,created_at);"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

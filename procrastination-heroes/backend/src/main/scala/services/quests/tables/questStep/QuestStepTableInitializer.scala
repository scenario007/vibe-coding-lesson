package services.quests.tables.questStep
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object QuestStepTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS quest_steps(id text PRIMARY KEY,quest_id text NOT NULL REFERENCES quests(id),position integer NOT NULL,title varchar(120) NOT NULL,description text NOT NULL,checklist text NOT NULL,minutes integer NOT NULL CHECK(minutes BETWEEN 1 AND 480),criterion text NOT NULL,depends_on text NOT NULL,completed_at bigint,coins integer NOT NULL CHECK(coins>=0),UNIQUE(quest_id,position));"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

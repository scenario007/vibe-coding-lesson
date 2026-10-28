package services.ai.tables.generationJob
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object GenerationJobTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS ai_generation_jobs(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),status text NOT NULL,goal text NOT NULL,due_date text,daily_minutes integer,preference text NOT NULL,feedback text NOT NULL,result text,error text,created_at bigint NOT NULL,request_key text NOT NULL,generate_reward_image boolean NOT NULL DEFAULT true,UNIQUE(user_id,request_key)); ALTER TABLE ai_generation_jobs ALTER COLUMN daily_minutes DROP NOT NULL; ALTER TABLE ai_generation_jobs ADD COLUMN IF NOT EXISTS generate_reward_image boolean NOT NULL DEFAULT true;"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

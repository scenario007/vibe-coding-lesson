package services.game.tables.StoryProgressTable
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object StoryProgressTableInitializer:
  def initialize(c: Connection): IO[Unit] = Jdbc.initialize(c,"CREATE TABLE IF NOT EXISTS mist_story_progress (truth text PRIMARY KEY, experienced boolean NOT NULL DEFAULT false, cleared boolean NOT NULL DEFAULT false, viewed boolean NOT NULL DEFAULT false); ALTER TABLE mist_story_progress ADD COLUMN IF NOT EXISTS viewed boolean NOT NULL DEFAULT false")

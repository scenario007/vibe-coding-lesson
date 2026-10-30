package services.game.tables.OutcomeTable
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object OutcomeTableInitializer:
  def initialize(c: Connection): IO[Unit] = Jdbc.initialize(c,"CREATE TABLE IF NOT EXISTS mist_outcomes(id text PRIMARY KEY, character_name text NOT NULL, kind text NOT NULL CHECK(kind IN ('death','success','failure')), hour integer NOT NULL, summary text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now())")

package services.game.tables.AdventureTable
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object AdventureTableInitializer:
  def initialize(c: Connection): IO[Unit] = Jdbc.initialize(c, """CREATE TABLE IF NOT EXISTS mist_adventures (id text PRIMARY KEY, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS mist_saves (adventure_id text NOT NULL REFERENCES mist_adventures(id) ON DELETE CASCADE, slot integer NOT NULL CHECK(slot BETWEEN 0 AND 3), state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(adventure_id, slot));""")

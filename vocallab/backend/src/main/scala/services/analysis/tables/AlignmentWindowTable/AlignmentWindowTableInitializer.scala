package services.analysis.tables.AlignmentWindowTable

import cats.effect.{IO, Resource}
import java.sql.Connection

object AlignmentWindowTableInitializer:
  private val schemaSql = """
    CREATE TABLE IF NOT EXISTS vocal_alignment_window (
      reference_id UUID NOT NULL REFERENCES vocal_media(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES vocal_media(id) ON DELETE CASCADE,
      reference_start DOUBLE PRECISION NOT NULL,
      user_start DOUBLE PRECISION NOT NULL,
      window_start DOUBLE PRECISION NOT NULL,
      window_end DOUBLE PRECISION NOT NULL,
      PRIMARY KEY (reference_id, user_id, reference_start, user_start),
      CHECK (window_start >= 0 AND window_end - window_start >= 1)
    );
    CREATE INDEX IF NOT EXISTS vocal_alignment_window_user_idx ON vocal_alignment_window(user_id)
  """
  def initialize(connection: Connection): IO[Unit] =
    Resource.fromAutoCloseable(IO.blocking(connection.createStatement()))
      .use(statement => IO.blocking(statement.execute(schemaSql)).void)

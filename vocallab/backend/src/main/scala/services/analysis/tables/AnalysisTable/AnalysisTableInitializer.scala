package services.analysis.tables.AnalysisTable

import cats.effect.{IO, Resource}
import java.sql.Connection

object AnalysisTableInitializer:
  private val schemaSql = """
    CREATE TABLE IF NOT EXISTS vocal_analysis (
      id UUID PRIMARY KEY,
      reference_id UUID NOT NULL REFERENCES vocal_media(id),
      user_id UUID NOT NULL REFERENCES vocal_media(id),
      selection JSONB NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','processing','completed','failed')),
      stage TEXT NOT NULL,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS vocal_analysis_status_idx ON vocal_analysis (status, created_at)
  """
  def initialize(connection: Connection): IO[Unit] =
    Resource.fromAutoCloseable(IO.blocking(connection.createStatement()))
      .use(statement => IO.blocking(statement.execute(schemaSql)).void)

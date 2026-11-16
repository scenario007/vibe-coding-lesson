package services.analysis.tables.MediaTable

import cats.effect.{IO, Resource}
import java.sql.Connection

object MediaTableInitializer:
  private val schemaSql = """
    CREATE TABLE IF NOT EXISTS vocal_media (
      id UUID PRIMARY KEY, metadata JSONB NOT NULL, digest TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  """
  def initialize(connection: Connection): IO[Unit] =
    Resource.fromAutoCloseable(IO.blocking(connection.createStatement()))
      .use(statement => IO.blocking(statement.execute(schemaSql)).void)

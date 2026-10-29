package services.economy.tables.furniturePreview

import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc

object FurniturePreviewTableInitializer:
  private val sql = """CREATE TABLE IF NOT EXISTS furniture_previews(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),prompt text NOT NULL,refined_description text NOT NULL,slot text NOT NULL,image_url text NOT NULL,created_at bigint NOT NULL,confirmed boolean NOT NULL DEFAULT false);"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,sql)

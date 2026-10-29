package services.economy.tables.playerItem
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object PlayerItemTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS player_items(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),item_id text NOT NULL REFERENCES store_items(id),purchased_at bigint NOT NULL,UNIQUE(user_id,item_id));"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

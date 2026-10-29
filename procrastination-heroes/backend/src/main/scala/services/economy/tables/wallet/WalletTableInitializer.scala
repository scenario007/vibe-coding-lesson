package services.economy.tables.wallet
import cats.effect.IO
import java.sql.Connection
import services.system.tables.Jdbc
object WalletTableInitializer:
  private val initializeSql = """CREATE TABLE IF NOT EXISTS wallets(user_id text PRIMARY KEY REFERENCES users(id),coins integer NOT NULL DEFAULT 0 CHECK(coins>=0)); INSERT INTO wallets(user_id) SELECT id FROM users ON CONFLICT (user_id) DO NOTHING;"""
  def initialize(connection: Connection): IO[Unit] = Jdbc.initialize(connection,initializeSql)

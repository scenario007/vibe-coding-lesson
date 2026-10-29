package services.economy.tables.wallet
import cats.effect.IO
import java.sql.Connection
import io.circe.syntax.*
import services.system.tables.Jdbc
import services.economy.objects.*
import services.users.objects.UserId

object WalletTable:
  private val initializeForUserSql = """INSERT INTO wallets(user_id) VALUES(?) ON CONFLICT DO NOTHING"""
  def initializeForUser(connection: Connection, userId: UserId): IO[Int] =
    Jdbc.update(connection,initializeForUserSql,List(userId.value))

  private val getSql = """SELECT coins FROM wallets WHERE user_id=?"""
  def get(connection: Connection, userId: UserId): IO[Option[WalletRecord]] =
    Jdbc.query(connection,getSql,List(userId.value))(r => WalletRecord(r.getInt("coins"))).map(_.headOption)

  private val lockSql = """SELECT coins FROM wallets WHERE user_id=? FOR UPDATE"""
  def lock(connection: Connection, userId: UserId): IO[Option[WalletRecord]] =
    Jdbc.query(connection,lockSql,List(userId.value))(r => WalletRecord(r.getInt("coins"))).map(_.headOption)

  private val changeSql = """UPDATE wallets SET coins=coins+? WHERE user_id=? AND coins+?>=0"""
  def change(connection: Connection, userId: UserId, amount: Int): IO[Int] =
    Jdbc.update(connection,changeSql,List(amount,userId.value,amount))

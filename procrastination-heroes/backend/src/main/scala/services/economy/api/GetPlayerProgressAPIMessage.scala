package services.economy.api
import services.system.objects.AppError
import services.economy.objects.PlayerProgress
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.time.{Instant, ZoneId}
import services.system.api.APIWithTokenMessage
import services.economy.tables.wallet.WalletTable
import services.economy.tables.rewardEvent.RewardEventTable
import services.adventure.tables.progress.ProgressTable


final case class GetPlayerProgressAPIMessage(userId: UserId) extends APIWithTokenMessage[PlayerProgress]:
  override def plan(connection: Connection): IO[PlayerProgress] =
    for
      wallet <- WalletTable.get(connection,userId).flatMap(v=>IO.fromOption(v)(AppError(500,"钱包尚未初始化")))
      xp <- ProgressTable.get(connection,userId)
      now <- IO.realTime.map(_.toMillis)
      daily <- RewardEventTable.dailyCoins(connection,userId,Instant.ofEpochMilli(now).atZone(ZoneId.of("Asia/Shanghai")).toLocalDate.toString)
    yield PlayerProgress(xp.headOption.getOrElse(0),wallet.coins,daily.headOption.getOrElse(0))

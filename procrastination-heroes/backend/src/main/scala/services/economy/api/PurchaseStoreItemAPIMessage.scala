package services.economy.api
import services.system.objects.AppError
import services.economy.objects.apiTypes.BaseResponse
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import services.system.api.APIWithTokenMessage
import services.economy.tables.wallet.WalletTable
import services.economy.tables.storeItem.StoreItemTable
import services.economy.tables.playerItem.PlayerItemTable


final case class PurchaseStoreItemAPIMessage(userId: UserId, itemId: String) extends APIWithTokenMessage[BaseResponse]:
  override def plan(connection: Connection): IO[BaseResponse] =
    for
      wallet <- WalletTable.lock(connection,userId).flatMap(v=>IO.fromOption(v)(AppError(500,"钱包尚未初始化")))
      owned <- PlayerItemTable.list(connection,userId)
      item <- StoreItemTable.find(connection,itemId).flatMap(v=>IO.fromOption(v)(AppError(404,"商品不存在")))
      _ <- if owned.exists(_.itemId==itemId) then IO.unit else
        for
          _ <- if wallet.coins>=item.price then IO.unit else IO.raiseError(AppError(409,s"还差 ${item.price-wallet.coins} 冒险币，完成一小步再回来吧"))
          _ <- WalletTable.change(connection,userId,-item.price)
          id <- IO(UUID.randomUUID().toString)
          now <- IO.realTime.map(_.toMillis)
          _ <- PlayerItemTable.insert(connection,userId,id,itemId,now)
        yield ()
      result <- GetBaseAPIMessage(userId).plan(connection)
    yield result

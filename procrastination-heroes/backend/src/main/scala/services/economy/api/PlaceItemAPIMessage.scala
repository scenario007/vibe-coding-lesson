package services.economy.api
import services.system.objects.AppError
import services.economy.objects.apiTypes.BaseResponse
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.economy.tables.wallet.WalletTable
import services.economy.tables.taskReward.TaskRewardTable
import services.economy.tables.storeItem.StoreItemTable
import services.economy.tables.playerItem.PlayerItemTable
import services.economy.tables.roomPlacement.RoomPlacementTable


final case class PlaceItemAPIMessage(userId: UserId, slot: String, itemId: Option[String], rewardId: Option[String]) extends APIWithTokenMessage[BaseResponse]:
  override def plan(connection: Connection): IO[BaseResponse] =
    for
      _ <- WalletTable.lock(connection,userId)
      _ <- if slot.trim.nonEmpty && !(itemId.nonEmpty && rewardId.nonEmpty) then IO.unit else IO.raiseError(AppError(400,"请选择一件要放进据点的素材"))
      owned <- PlayerItemTable.list(connection,userId)
      items <- StoreItemTable.list(connection,userId)
      rewards <- TaskRewardTable.list(connection,userId)
      validItem = itemId.exists(id=>owned.exists(o=>o.id==id && items.exists(_.id==o.itemId)))
      validReward = rewardId.exists(id=>rewards.exists(_.id==id))
      _ <- if itemId.isEmpty && rewardId.isEmpty || validItem || validReward then IO.unit else IO.raiseError(AppError(403,"这件装饰尚未解锁，或不适合这个位置"))
      _ <- RoomPlacementTable.clear(connection,userId,slot)
      _ <- if itemId.isEmpty && rewardId.isEmpty then IO.unit else RoomPlacementTable.place(connection,userId,slot,itemId,rewardId).void
      result <- GetBaseAPIMessage(userId).plan(connection)
    yield result

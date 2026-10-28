package services.economy.api
import services.economy.objects.apiTypes.BaseResponse
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.economy.tables.taskReward.TaskRewardTable
import services.economy.tables.storeItem.StoreItemTable
import services.economy.tables.playerItem.PlayerItemTable
import services.economy.tables.roomPlacement.RoomPlacementTable


final case class GetBaseAPIMessage(userId: UserId) extends APIWithTokenMessage[BaseResponse]:
  override def plan(connection: Connection): IO[BaseResponse] =
    for
      items <- StoreItemTable.list(connection,userId)
      owned <- PlayerItemTable.list(connection,userId)
      rewards <- TaskRewardTable.list(connection,userId)
      placements <- RoomPlacementTable.list(connection,userId)
      progress <- GetPlayerProgressAPIMessage(userId).plan(connection)
    yield BaseResponse(items,owned,rewards,placements,progress)

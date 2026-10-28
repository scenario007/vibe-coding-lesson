package services.economy.api

import cats.effect.IO
import java.sql.Connection
import services.economy.objects.apiTypes.BaseResponse
import services.economy.tables.roomPlacement.RoomPlacementTable
import services.system.api.APIWithTokenMessage
import services.system.objects.AppError
import services.users.objects.UserId

final case class MovePlacementAPIMessage(userId: UserId, id: String, x: Int, y: Int)
    extends APIWithTokenMessage[BaseResponse]:
  override def plan(connection: Connection): IO[BaseResponse] =
    val valid = id.trim.nonEmpty && x >= 4 && x <= 96 && y >= 8 && y <= 92
    for
      _ <- if valid then IO.unit else IO.raiseError(AppError(400, "据点坐标不合法"))
      changed <- RoomPlacementTable.move(connection, userId, id, x, y)
      _ <- if changed == 1 then IO.unit else IO.raiseError(AppError(404, "找不到这件据点素材"))
      result <- GetBaseAPIMessage(userId).plan(connection)
    yield result

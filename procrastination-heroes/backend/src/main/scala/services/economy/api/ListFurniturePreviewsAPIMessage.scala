package services.economy.api

import cats.effect.IO
import java.sql.Connection
import services.economy.objects.FurniturePreview
import services.economy.tables.furniturePreview.FurniturePreviewTable
import services.system.api.APIWithTokenMessage
import services.users.objects.UserId

final case class ListFurniturePreviewsAPIMessage(userId: UserId) extends APIWithTokenMessage[List[FurniturePreview]]:
  override def plan(connection: Connection): IO[List[FurniturePreview]] = FurniturePreviewTable.listPending(connection,userId)

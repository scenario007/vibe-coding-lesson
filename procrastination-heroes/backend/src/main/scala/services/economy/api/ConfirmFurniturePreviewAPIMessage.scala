package services.economy.api

import cats.effect.IO
import java.sql.Connection
import java.util.UUID
import services.economy.objects.*
import services.economy.objects.apiTypes.BaseResponse
import services.economy.tables.furniturePreview.FurniturePreviewTable
import services.economy.tables.playerItem.PlayerItemTable
import services.economy.tables.storeItem.StoreItemTable
import services.economy.tables.wallet.WalletTable
import services.system.api.APIWithTokenMessage
import services.system.objects.AppError
import services.users.objects.UserId

final case class ConfirmFurniturePreviewAPIMessage(userId: UserId, previewId: String, useOriginal: Option[Boolean]) extends APIWithTokenMessage[BaseResponse]:
  override def plan(connection: Connection): IO[BaseResponse] =
    for
      wallet <- WalletTable.lock(connection,userId).flatMap(v => IO.fromOption(v)(AppError(500,"钱包尚未初始化")))
      preview <- FurniturePreviewTable.lock(connection,previewId,userId).flatMap(v => IO.fromOption(v)(AppError(404,"找不到这件家具预览")))
      _ <- if preview.confirmed then IO.unit else
        for
          _ <- if wallet.coins >= 5 then IO.unit else IO.raiseError(AppError(409,"领取家具需要 5 枚冒险币"))
          imageUrl = if useOriginal.contains(true) && !preview.imageUrl.endsWith(".original.png") then preview.imageUrl.stripSuffix(".png")+".original.png" else preview.imageUrl
          item = StoreItem("custom-"+preview.id,"定制·"+preview.prompt.take(18),"家具需求："+preview.prompt,5,preview.slot,RewardSymbol.star,RewardPalette.sage,Some(imageUrl))
          _ <- WalletTable.change(connection,userId,-5)
          _ <- StoreItemTable.insert(connection,item)
          ownedId <- IO(UUID.randomUUID().toString)
          now <- IO.realTime.map(_.toMillis)
          _ <- PlayerItemTable.insert(connection,userId,ownedId,item.id,now)
          _ <- FurniturePreviewTable.confirm(connection,preview.id,userId)
        yield ()
      result <- GetBaseAPIMessage(userId).plan(connection)
    yield result

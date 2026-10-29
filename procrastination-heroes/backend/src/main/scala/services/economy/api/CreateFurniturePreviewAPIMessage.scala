package services.economy.api

import cats.effect.IO
import java.sql.Connection
import java.util.UUID
import services.ai.api.GenerateImageAPIMessage
import services.ai.objects.ImageAssetKind
import services.economy.objects.{FurniturePreview, RoomSlot}
import services.economy.tables.furniturePreview.FurniturePreviewTable
import services.economy.tables.wallet.WalletTable
import services.system.api.APIWithTokenMessage
import services.system.objects.AppError
import services.users.objects.UserId

final case class CreateFurniturePreviewAPIMessage(userId: UserId, prompt: String, slot: RoomSlot) extends APIWithTokenMessage[FurniturePreview]:
  override def plan(connection: Connection): IO[FurniturePreview] =
    for
      clean <- IO(prompt.trim)
      _ <- if clean.length >= 2 && clean.length <= 160 then IO.unit else IO.raiseError(AppError(400,"请描述至少两个字的家具需求"))
      wallet <- WalletTable.get(connection,userId).flatMap(v => IO.fromOption(v)(AppError(500,"钱包尚未初始化")))
      _ <- if wallet.coins >= 5 then IO.unit else IO.raiseError(AppError(409,"需要 5 枚冒险币才能领取家具"))
      id <- IO(UUID.randomUUID().toString)
      generated <- GenerateImageAPIMessage(userId,ImageAssetKind.furniture,clean,"custom-"+id).plan(connection)
      image <- IO.fromOption(generated.imageUrl)(AppError(503,"图片生成未完成，未扣冒险币。请检查图片服务配置或稍后重试。"))
      now <- IO.realTime.map(_.toMillis)
      preview = FurniturePreview(id,clean,generated.refinedDescription,slot,image,now,false)
      _ <- FurniturePreviewTable.insert(connection,userId,preview)
    yield preview

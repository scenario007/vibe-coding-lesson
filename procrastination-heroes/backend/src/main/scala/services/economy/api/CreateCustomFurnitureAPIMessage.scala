package services.economy.api

import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import java.util.UUID
import services.economy.objects.*
import services.economy.objects.apiTypes.BaseResponse
import services.economy.tables.playerItem.PlayerItemTable
import services.economy.tables.storeItem.StoreItemTable
import services.economy.tables.wallet.WalletTable
import services.system.api.APIWithTokenMessage
import services.system.objects.AppError
import services.users.objects.UserId

final case class CreateCustomFurnitureAPIMessage(
    userId: UserId,
    prompt: String,
    slot: RoomSlot
) extends APIWithTokenMessage[BaseResponse]:
  override def plan(connection: Connection): IO[BaseResponse] =
    for
      clean <- IO(prompt.trim)
      _ <- if clean.length >= 2 && clean.length <= 160 then IO.unit else IO.raiseError(AppError(400, "请描述至少两个字的家具需求"))
      wallet <- WalletTable.lock(connection, userId).flatMap(v => IO.fromOption(v)(AppError(500, "钱包尚未初始化")))
      _ <- if wallet.coins >= 5 then IO.unit else IO.raiseError(AppError(409, "定制家具需要 5 枚冒险币，先完成一小步再来吧"))
      itemId <- IO("custom-" + UUID.randomUUID().toString)
      symbol = if clean.contains("灯") then RewardSymbol.lamp else if clean.contains("植物") || clean.contains("花") then RewardSymbol.leaf else if clean.contains("椅") then RewardSymbol.cloud else if clean.contains("柜") || clean.contains("书") then RewardSymbol.book else RewardSymbol.star
      palette = if clean.contains("红") then RewardPalette.rose else if clean.contains("蓝") then RewardPalette.sky else if clean.contains("金") || clean.contains("暖") then RewardPalette.gold else RewardPalette.sage
      item = StoreItem(itemId, "定制·" + clean.take(18), "AI 家具参数草案：" + clean, 5, slot, symbol, palette)
      _ <- WalletTable.change(connection, userId, -5).flatMap(changed => if changed == 1 then IO.unit else IO.raiseError(AppError(409, "冒险币余额发生变化，请重试")))
      _ <- StoreItemTable.insert(connection, item)
      ownedId <- IO(UUID.randomUUID().toString)
      now <- IO.realTime.map(_.toMillis)
      _ <- PlayerItemTable.insert(connection, userId, ownedId, itemId, now)
      result <- GetBaseAPIMessage(userId).plan(connection)
    yield result

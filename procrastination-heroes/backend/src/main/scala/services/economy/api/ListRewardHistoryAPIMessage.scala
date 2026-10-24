package services.economy.api
import services.economy.objects.RewardEvent
import services.users.objects.UserId
import cats.effect.IO
import cats.syntax.all.*
import java.sql.Connection
import services.system.api.APIWithTokenMessage
import services.economy.tables.rewardEvent.RewardEventTable


final case class ListRewardHistoryAPIMessage(userId: UserId) extends APIWithTokenMessage[List[RewardEvent]]:
  override def plan(connection: Connection): IO[List[RewardEvent]] =
    RewardEventTable.list(connection,userId)

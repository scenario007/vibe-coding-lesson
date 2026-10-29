package services.adventure.objects.apiTypes
import services.adventure.objects.*
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import services.users.objects.UserProfile
import services.economy.objects.{PlayerProgress, TaskReward}
import services.quests.objects.apiTypes.QuestDetail
final case class DashboardResponse(user: UserProfile, progress: PlayerProgress, quests: List[QuestDetail], completedCount: Int, todaySteps: Int, focusSeconds: Int, week: List[DayActivity], rewards: List[TaskReward])
object DashboardResponse:
  given Encoder[DashboardResponse] = deriveEncoder[DashboardResponse]
  given Decoder[DashboardResponse] = deriveDecoder[DashboardResponse]

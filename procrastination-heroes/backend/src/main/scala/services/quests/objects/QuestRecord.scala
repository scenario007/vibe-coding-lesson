package services.quests.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import services.users.objects.UserId
final case class QuestRecord(id: QuestId, userId: UserId, title: String, category: QuestCategory, description: String, dueDate: Option[String], tier: RewardTier, status: QuestStatus, archivedFrom: QuestStatus, version: Int, reflection: String, createdAt: Long, completedAt: Option[Long])
object QuestRecord:
  given Encoder[QuestRecord] = deriveEncoder[QuestRecord]
  given Decoder[QuestRecord] = deriveDecoder[QuestRecord]

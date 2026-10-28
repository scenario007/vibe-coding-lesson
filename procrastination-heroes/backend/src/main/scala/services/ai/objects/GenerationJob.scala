package services.ai.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import services.users.objects.UserId
final case class GenerationJob(id: JobId, userId: UserId, status: JobStatus, goal: String, dueDate: Option[String], dailyMinutes: Option[Int], preference: String, feedback: String, result: Option[PlanDraft], error: Option[String], createdAt: Long, generateRewardImage: Boolean = true)
object GenerationJob:
  given Encoder[GenerationJob] = deriveEncoder[GenerationJob]
  given Decoder[GenerationJob] = deriveDecoder[GenerationJob]

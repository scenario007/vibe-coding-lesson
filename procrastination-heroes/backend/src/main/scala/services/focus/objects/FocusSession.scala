package services.focus.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import services.users.objects.UserId
import services.quests.objects.StepId
final case class FocusSession(id: FocusId, userId: UserId, stepId: Option[StepId], targetSeconds: Int, status: FocusStatus, elapsedSeconds: Int, runningSince: Option[Long], createdAt: Long, endedAt: Option[Long])
object FocusSession:
  given Encoder[FocusSession] = deriveEncoder[FocusSession]
  given Decoder[FocusSession] = deriveDecoder[FocusSession]

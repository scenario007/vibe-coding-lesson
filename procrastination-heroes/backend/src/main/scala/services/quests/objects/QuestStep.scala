package services.quests.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class QuestStep(id: StepId, questId: QuestId, position: Int, title: String, description: String, checklist: List[String], minutes: Int, criterion: String, dependsOn: List[Int], completedAt: Option[Long])
object QuestStep:
  given Encoder[QuestStep] = deriveEncoder[QuestStep]
  given Decoder[QuestStep] = deriveDecoder[QuestStep]

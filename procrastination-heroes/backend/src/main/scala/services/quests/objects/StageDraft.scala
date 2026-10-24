package services.quests.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class StageDraft(title: String, description: String, checklist: List[String], minutes: Int, criterion: String, dependsOn: List[Int])
object StageDraft:
  given Encoder[StageDraft] = deriveEncoder[StageDraft]
  given Decoder[StageDraft] = deriveDecoder[StageDraft]

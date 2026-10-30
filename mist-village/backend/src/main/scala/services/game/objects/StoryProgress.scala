package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class StoryProgress(storyId: String, title: String, experienced: Boolean, cleared: Boolean, revealedTitle: Option[String])
object StoryProgress:
  given Encoder[StoryProgress] = deriveEncoder
  given Decoder[StoryProgress] = deriveDecoder

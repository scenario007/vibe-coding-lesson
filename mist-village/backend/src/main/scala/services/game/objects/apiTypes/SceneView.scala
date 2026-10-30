package services.game.objects.apiTypes

import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*

final case class SceneView(locationId: String, title: String, description: String, peoplePresent: List[ScenePerson])
object SceneView:
  given Encoder[SceneView] = deriveEncoder
  given Decoder[SceneView] = deriveDecoder

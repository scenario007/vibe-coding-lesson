package services.game.objects.apiTypes

import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
import services.game.objects.NpcCondition

final case class ScenePerson(id: String, name: String, condition: NpcCondition, met: Boolean)
object ScenePerson:
  given Encoder[ScenePerson] = deriveEncoder
  given Decoder[ScenePerson] = deriveDecoder

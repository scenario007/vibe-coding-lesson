package services.game.objects.apiTypes

import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*

final case class MapLocation(id: String, name: String, current: Boolean, travelHours: Option[Int], routeOpen: Boolean, routeNote: Option[String])
object MapLocation:
  given Encoder[MapLocation] = deriveEncoder
  given Decoder[MapLocation] = deriveDecoder

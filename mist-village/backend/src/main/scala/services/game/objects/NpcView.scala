package services.game.objects
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
final case class NpcView(id: String, name: String, attitude: String, lastKnownPlace: String, knownMemories: List[String], lastSeenHour: Option[Int], knownCondition: Option[NpcCondition])
object NpcView:
  given Encoder[NpcView] = deriveEncoder
  given Decoder[NpcView] = deriveDecoder
  def attitudeFor(trust: Int): String =
    if trust < 20 then "敌视"
    else if trust < 40 then "戒备"
    else if trust < 60 then "中立"
    else if trust < 80 then "友善"
    else "信赖"

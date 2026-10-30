package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class PlayerStats(body: Int, agility: Int, insight: Int, social: Int, growthPoints: Int, talents: List[String])
object PlayerStats:
  given Encoder[PlayerStats] = deriveEncoder
  given Decoder[PlayerStats] = deriveDecoder
  def forRole(role: String): PlayerStats = role match
    case "流浪医师" => PlayerStats(0,0,2,0,0,Nil)
    case "前矿工" => PlayerStats(2,0,0,0,0,Nil)
    case "商队向导" => PlayerStats(0,1,0,1,0,Nil)
    case "调查员" => PlayerStats(0,0,2,0,0,Nil)
    case _ => PlayerStats(0,0,1,1,0,Nil)

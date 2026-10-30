package services.game.objects
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
final case class NpcState(id: String, name: String, place: String, trust: Int, met: Boolean, memories: List[String], lastKnownPlace: String, knownTrust: Option[Int] = None, lastSeenHour: Option[Int] = None, condition: NpcCondition = NpcCondition.healthy, knownCondition: Option[NpcCondition] = None, expeditionStarted: Option[Int] = None, facts: List[NpcFact] = Nil, contacts: List[String] = Nil)
object NpcState:
  given Encoder[NpcState] = deriveEncoder
  given Decoder[NpcState] = Decoder.instance { c =>
    for
      id <- c.get[String]("id"); name <- c.get[String]("name"); place <- c.get[String]("place")
      trust <- c.get[Int]("trust"); met <- c.get[Boolean]("met"); memories <- c.get[List[String]]("memories")
      known <- c.get[Option[String]]("lastKnownPlace"); knownTrust <- c.get[Option[Int]]("knownTrust"); lastSeenHour <- c.get[Option[Int]]("lastSeenHour"); condition <- c.get[Option[NpcCondition]]("condition"); knownCondition <- c.get[Option[NpcCondition]]("knownCondition"); expeditionStarted <- c.get[Option[Int]]("expeditionStarted"); facts <- c.get[Option[List[NpcFact]]]("facts"); contacts <- c.get[Option[List[String]]]("contacts")
    yield NpcState(id,name,place,trust,met,memories,known.getOrElse(if met then place else ""),knownTrust.orElse(if met then Some(trust) else None),lastSeenHour,condition.getOrElse(NpcCondition.healthy),knownCondition,expeditionStarted,facts.getOrElse(Nil),contacts.getOrElse(Nil))
  }
  val initial: List[NpcState] = List(
    NpcState("smith","铁匠阿岚","gate",50,false,Nil,""),
    NpcState("healer","药师林婆","clinic",50,false,Nil,""),
    NpcState("guard","守卫罗恩","gate",50,false,Nil,""),
    NpcState("mayor","村长伊芙","hall",50,false,Nil,""),
    NpcState("mia","矿工少女米娅","forge",50,false,Nil,""),
    NpcState("merchant","旅商诺亚","hall",50,false,Nil,""))

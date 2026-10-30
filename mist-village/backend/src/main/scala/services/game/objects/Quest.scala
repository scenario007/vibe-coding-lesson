package services.game.objects
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
final case class Quest(id: String, title: String, status: QuestStatus, deadline: Option[Int], description: String, goal: Option[String] = None, issuer: Option[String] = None, reward: Option[String] = None, goalReached: Boolean = false)
object Quest:
  given Encoder[Quest] = deriveEncoder
  given Decoder[Quest] = Decoder.instance { c =>
    for
      id <- c.get[String]("id")
      title <- c.get[String]("title")
      status <- c.get[QuestStatus]("status")
      deadline <- c.get[Option[Int]]("deadline")
      description <- c.get[String]("description")
      goal <- c.get[Option[String]]("goal")
      issuer <- c.get[Option[String]]("issuer")
      reward <- c.get[Option[String]]("reward")
      reached <- c.get[Option[Boolean]]("goalReached")
    yield Quest(id,title,status,deadline,description,goal,issuer,reward,reached.getOrElse(false))
  }

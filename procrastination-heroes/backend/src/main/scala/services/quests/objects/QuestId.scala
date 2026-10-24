package services.quests.objects
import io.circe.{Encoder, Decoder}
import java.util.UUID
import scala.util.Try
final case class QuestId(value: String)
object QuestId:
  given Encoder[QuestId] = Encoder.encodeString.contramap(_.value)
  given Decoder[QuestId] = Decoder.decodeString.emap(v => Try(UUID.fromString(v)).toEither.left.map(_ => "无效的标识").map(x => QuestId(x.toString)))

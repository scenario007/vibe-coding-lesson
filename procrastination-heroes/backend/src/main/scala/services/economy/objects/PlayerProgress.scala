package services.economy.objects
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class PlayerProgress(experience: Int, coins: Int, todayCoins: Int)
object PlayerProgress:
  given Encoder[PlayerProgress] = deriveEncoder[PlayerProgress]
  given Decoder[PlayerProgress] = deriveDecoder[PlayerProgress]

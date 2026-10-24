package services.adventure.objects.apiTypes
import services.adventure.objects.*
import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}

final case class DayActivity(date: String, steps: Int, focusSeconds: Int, coins: Int)
object DayActivity:
  given Encoder[DayActivity] = deriveEncoder[DayActivity]
  given Decoder[DayActivity] = deriveDecoder[DayActivity]

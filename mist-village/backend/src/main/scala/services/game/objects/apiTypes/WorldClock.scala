package services.game.objects.apiTypes

import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*

final case class WorldClock(day: Int, period: String, time: String, absoluteHour: Int)
object WorldClock:
  given Encoder[WorldClock] = deriveEncoder
  given Decoder[WorldClock] = deriveDecoder
  def at(hour: Int): WorldClock =
    val day=Math.floorDiv(hour,24)+1
    val withinDay=Math.floorMod(hour,24)
    val period=withinDay match
      case h if h>=6 && h<11 => "上午"
      case h if h>=11 && h<14 => "中午"
      case h if h>=14 && h<18 => "下午"
      case h if h>=18 && h<22 => "夜晚"
      case _ => "深夜"
    WorldClock(day,period,f"$withinDay%02d:00",hour)

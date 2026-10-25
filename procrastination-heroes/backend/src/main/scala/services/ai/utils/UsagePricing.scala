package services.ai.utils
import io.circe.Json
import java.time.{Instant,ZoneId,DayOfWeek}
import services.ai.objects.TokenReading
private[ai] object UsagePricing:
  private[ai] def peak(at: Long): Boolean =
    val t = Instant.ofEpochMilli(at).atZone(ZoneId.of("Asia/Shanghai"))
    val workday = t.getDayOfWeek != DayOfWeek.SATURDAY && t.getDayOfWeek != DayOfWeek.SUNDAY
    workday && ((t.getHour>=9 && t.getHour<12) || (t.getHour>=14 && t.getHour<18))
  private[ai] def quote(payloadBytes: Int): BigDecimal = BigDecimal(payloadBytes.toLong+1536)*BigDecimal("2")/1000000 + BigDecimal(1800)*8/1000000
  private[ai] def reading(json: Json): Option[TokenReading] =
    val u=json.hcursor.downField("usage")
    for
      in <- u.get[Long]("prompt_tokens").toOption
      out <- u.get[Long]("completion_tokens").toOption
      cached = u.downField("prompt_tokens_details").get[Long]("cached_tokens").toOption.orElse(u.get[Long]("cache_read_tokens").toOption).orElse(u.get[Long]("prompt_cache_hit_tokens").toOption).getOrElse(0L)
      if in>=0 && out>=0 && cached>=0 && cached<=in
    yield TokenReading(in,out,cached)
  private[ai] def estimate(v: TokenReading, started: Long, ended: Long): BigDecimal =
    val high=peak(started)||peak(ended)
    (BigDecimal(v.input-v.cached)*(if high then BigDecimal(2) else BigDecimal(1)) + BigDecimal(v.cached)*(if high then BigDecimal("0.04") else BigDecimal("0.02")) + BigDecimal(v.output)*(if high then BigDecimal(8) else BigDecimal(4)))/1000000

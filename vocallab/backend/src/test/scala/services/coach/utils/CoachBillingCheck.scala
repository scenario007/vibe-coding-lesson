package services.coach.utils

import java.time.Instant

object CoachBillingCheck:
  def main(args: Array[String]): Unit =
    val base = "https://tokenhub.tencentmaas.com/v1"
    val model = "deepseek-v4.1-flash"
    // 100 uncached, 900 cached and 200 output tokens.
    val offPeak = Instant.parse("2026-11-18T04:00:00Z")
    val peak = Instant.parse("2026-11-18T01:00:00Z")
    val weekend = Instant.parse("2026-11-21T01:00:00Z")
    assert(CoachBilling.estimate(base, model, 1000, 200, 900, offPeak).contains(BigDecimal("0.000918")))
    assert(CoachBilling.estimate(base, model, 1000, 200, 900, peak).contains(BigDecimal("0.001836")))
    assert(CoachBilling.estimate(base, model, 1000, 200, 900, weekend).contains(BigDecimal("0.000918")))
    assert(CoachBilling.estimate("https://api.deepseek.com/anthropic/v1/messages", "deepseek-flash",
      1000, 200, 900, offPeak).contains(BigDecimal("0.000918")))
    assert(CoachBilling.estimate(base, "unknown", 1000, 200, 900, peak).isEmpty)
    assert(CoachBilling.estimate("https://example.com/v1", model, 1000, 200, 900, peak).isEmpty)

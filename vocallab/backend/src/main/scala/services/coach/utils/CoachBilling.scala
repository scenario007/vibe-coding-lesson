package services.coach.utils

import cats.effect.IO
import io.circe.Json
import io.circe.parser.decode
import io.circe.syntax.*
import java.net.URI
import java.nio.file.{Files, Path, StandardOpenOption}
import java.time.{Instant, LocalTime, ZoneId}
import java.util.UUID
import scala.jdk.CollectionConverters.*
import scala.util.Try
import services.coach.objects.CoachUsage
import services.coach.objects.apiTypes.CoachUsageSummary
import services.system.objects.AppConfig

private[coach] object CoachBilling:
  private def ledger(config: AppConfig, id: UUID): Path =
    config.runData.resolve("analyses").resolve(id.toString).resolve("coach-usage.jsonl")

  private def record(config: AppConfig, id: UUID, entry: CoachUsage): IO[Unit] =
    IO.blocking {
      Files.writeString(ledger(config, id), entry.asJson.noSpaces + "\n", StandardOpenOption.CREATE, StandardOpenOption.APPEND)
    }.void

  private[coach] def estimate(url: String, model: String, input: Long, output: Long, cached: Long, at: Instant): Option[BigDecimal] =
    // Published TokenHub Guangzhou list rates, checked 2026-11-18. Account discounts and credits are unknown.
    val known = Set("deepseek-v4.1-flash", "deepseek-v4.1-flash-1017")
    val host = Try(URI.create(url)).toOption.map(_.getHost)
    val tokenHubFlash = host.contains("tokenhub.tencentmaas.com") && known(model)
    val deepSeekFlash = host.contains("api.deepseek.com") && model == "deepseek-flash"
    Option.when(tokenHubFlash || deepSeekFlash) {
      val local = at.atZone(ZoneId.of("Asia/Shanghai"))
      val time = local.toLocalTime
      def during(from: Int, until: Int): Boolean =
        !time.isBefore(LocalTime.of(from, 0)) && time.isBefore(LocalTime.of(until, 0))
      val multiplier = if local.getDayOfWeek.getValue <= 5 && (during(9, 12) || during(14, 18)) then 2 else 1
      (BigDecimal(input - cached) + BigDecimal(output) * 4 + BigDecimal(cached) * BigDecimal("0.02")) *
        multiplier / 1000000
    }

  def text(config: AppConfig, id: UUID, url: String, model: String, response: Json, at: Instant): IO[Unit] =
    val usage = response.hcursor.downField("usage")
    val input = usage.get[Long]("prompt_tokens").toOption.filter(_ >= 0)
    val output = usage.get[Long]("completion_tokens").toOption.filter(_ >= 0)
    val cached = usage.downField("prompt_tokens_details").get[Long]("cached_tokens").toOption
      .orElse(usage.get[Long]("prompt_cache_hit_tokens").toOption).getOrElse(0L).max(0).min(input.getOrElse(0L))
    val cost = for
      a <- input
      b <- output
      amount <- estimate(url, model, a, b, cached, at)
    yield amount
    record(config, id, CoachUsage("text", input.getOrElse(0L), output.getOrElse(0L), cached, cost))

  def deepSeekResearch(config: AppConfig, id: UUID, url: String, response: Json, at: Instant): IO[Unit] =
    val usage = response.hcursor.downField("usage")
    val uncached = usage.get[Long]("input_tokens").toOption.filter(_ >= 0)
    val output = usage.get[Long]("output_tokens").toOption.filter(_ >= 0)
    val cached = usage.get[Long]("cache_read_input_tokens").getOrElse(0L).max(0)
    val input = uncached.map(_ + cached)
    val amount = for
      a <- input
      b <- output
      price <- estimate(url, "deepseek-flash", a, b, cached, at)
    yield price
    record(config, id, CoachUsage("text", input.getOrElse(0L), output.getOrElse(0L), cached, amount))

  def externalSearch(config: AppConfig, id: UUID): IO[Unit] =
    record(config, id, CoachUsage("search", 0, 0, 0, None))

  def summary(config: AppConfig, id: UUID): IO[CoachUsageSummary] = IO.blocking {
    val path = ledger(config, id)
    val entries = if Files.isRegularFile(path) then
      Files.readAllLines(path).asScala.toVector.flatMap(line => decode[CoachUsage](line).toOption)
    else Vector.empty
    val text = entries.filter(_.kind == "text")
    val amounts = text.flatMap(_.estimatedYuan)
    CoachUsageSummary(text.size, text.map(_.inputTokens).sum, text.map(_.outputTokens).sum,
      text.map(_.cachedTokens).sum, Option.when(amounts.nonEmpty)(amounts.sum),
      text.count(_.estimatedYuan.isEmpty), entries.count(_.kind == "search"))
  }

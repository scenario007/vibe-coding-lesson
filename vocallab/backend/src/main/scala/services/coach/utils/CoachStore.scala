package services.coach.utils

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import io.circe.{Decoder, Encoder, Json}
import io.circe.parser.decode
import io.circe.syntax.*
import java.nio.charset.StandardCharsets.UTF_8
import java.nio.file.{Files, Path, StandardCopyOption}
import java.security.MessageDigest
import java.util.HexFormat
import org.http4s.Status
import services.analysis.api.RunAcousticTools
import services.analysis.objects.AnalysisReport
import services.coach.objects.*
import services.system.objects.{ApiError, AppConfig}

private[coach] object CoachStore:
  def digest(text: String): String = HexFormat.of.formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(UTF_8)))

  def revision(report: AnalysisReport): String =
    val a = report.alignment
    digest(Json.arr(Json.fromInt(1), report.preprocessing.asJson, a.reliable.asJson, a.offsetSeconds.asJson,
      a.timeMapping.asJson, a.method.asJson, a.warnings.asJson).noSpaces)

  private def folder(config: AppConfig, report: AnalysisReport): Path =
    config.runData.resolve("analyses").resolve(report.analysisId.toString)

  private def sessionFile(config: AppConfig, report: AnalysisReport) = folder(config, report).resolve("coach-v2.json")

  private def read[A: Decoder](path: Path): IO[Option[A]] = IO.blocking {
    if Files.isRegularFile(path) && Files.size(path) <= 4194304 then decode[A](Files.readString(path)).toOption else None
  }.recover { case _: java.nio.file.NoSuchFileException => None }

  private def write[A: Encoder](path: Path, state: A): IO[A] =
    Resource.make(IO.blocking(Files.createTempFile(path.getParent, ".coach-", ".tmp")))(
      temp => IO.blocking(Files.deleteIfExists(temp)).void).use { temp =>
      IO.blocking {
        Files.writeString(temp, state.asJson.noSpaces)
        Files.move(temp, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        state
      }
    }

  def load(config: AppConfig, report: AnalysisReport): IO[Option[CoachSession]] = read(sessionFile(config, report))
  def save(config: AppConfig, report: AnalysisReport, session: CoachSession): IO[CoachSession] =
    write(sessionFile(config, report), session)

  def catalog(config: AppConfig): IO[Vector[ToolDefinition]] =
    IO.blocking(Files.readString(config.root.resolve("dsp/vocallab/coach_catalog.json")))
      .flatMap(raw => IO.fromEither(decode[Vector[ToolDefinition]](raw)))

  def acoustic(config: AppConfig, report: AnalysisReport, request: Json): IO[AcousticBatch] =
    val dir = folder(config, report).resolve("coach-tools")
    val key = digest(revision(report) + request.noSpaces)
    val file = dir.resolve(s"$key.json")
    read[AcousticBatch](file).flatMap {
      case Some(batch) => IO.println(s"[Coach] DSP cache hit calls=${batch.runs.size}").as(batch)
      case None =>
        for
          data <- RunAcousticTools.run(config, report, request)
          batch <- IO.fromEither(data.as[AcousticBatch])
          _ <- IO.raiseUnless(batch.version == 1 && batch.candidates.size <= 30 && batch.observations.size <= 24)(
            ApiError(Status.UnprocessableEntity, "专项分析证据超出预期范围。"))
          _ <- IO.println(s"[Coach] DSP tools=${batch.runs.size} elapsedMs=${batch.runs.map(_.milliseconds).sum}")
          _ <- IO.blocking {
            Files.createDirectories(dir)
            // Bound the per-report cache, including repeated coach follow-ups.
            val files = Files.list(dir)
            try
              import scala.jdk.CollectionConverters.*
              files.iterator().asScala.filter(_.getFileName.toString.endsWith(".json")).toVector
                .sortBy(p => Files.getLastModifiedTime(p).toMillis).dropRight(47).foreach(Files.deleteIfExists)
            finally files.close()
          }
          saved <- write(file, batch)
        yield saved
    }

  def research(config: AppConfig, song: SongInfo): IO[ResearchResult] =
    if !CoachProviders.searchAvailable then CoachProviders.search(song)
    else
      val label = Vector(song.title, song.artist, song.version).map(_.toLowerCase(java.util.Locale.ROOT)).mkString("\u0000")
      val dir = config.runData.resolve("coach-research")
      val path = dir.resolve(s"${digest(CoachProviders.searchEndpoint + label)}.json")
      for
        now <- IO.realTimeInstant
        fresh <- IO.blocking(Files.isRegularFile(path) && Files.getLastModifiedTime(path).toInstant.isAfter(now.minusSeconds(7L * 86400)))
        cached <- if fresh then read[ResearchResult](path) else IO.pure(None)
        result <- cached.fold {
          CoachProviders.search(song).flatTap { data =>
            if Set("results", "empty").contains(data.status) then IO.blocking(Files.createDirectories(dir)).void *> write(path, data).void
            else IO.unit
          }
        }(data => IO.println(s"[Coach] search cache hit sources=${data.sources.size}").as(data))
      yield result

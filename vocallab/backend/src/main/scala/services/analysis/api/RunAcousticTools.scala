package services.analysis.api

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import io.circe.Json
import io.circe.parser.parse
import io.circe.syntax.*
import java.nio.file.Files
import org.http4s.Status
import scala.concurrent.duration.*
import services.analysis.objects.AnalysisReport
import services.analysis.utils.{Command, LocalFiles}
import services.system.objects.{ApiError, AppConfig}

object RunAcousticTools:
  def run(config: AppConfig, report: AnalysisReport, request: Json): IO[Json] =
    val workspace = LocalFiles.analysis(config, report.analysisId)
    Resource.make(IO.blocking(Files.createTempDirectory(workspace, "coach-")))(LocalFiles.remove).use { directory =>
      val snapshot = directory.resolve("report.json")
      val input = directory.resolve("request.json")
      val output = directory.resolve("evidence.json")
      for
        _ <- IO.blocking {
          Files.writeString(snapshot, report.asJson.noSpaces)
          Files.writeString(input, request.noSpaces)
        }
        exit <- Command.run(List(config.python.toString, "-m", "vocallab.coach_tools",
          snapshot.toString, workspace.toString, input.toString, output.toString),
          config.root.resolve("dsp"), 15.seconds, line => IO.println(s"[Coach DSP ${report.analysisId}] $line"))
        _ <- IO.raiseUnless(exit == 0)(ApiError(Status.UnprocessableEntity, "专项声学分析未完成，请检查当前报告的音高数据。"))
        raw <- IO.blocking(Files.readString(output))
        data <- IO.fromEither(parse(raw))
      yield data
    }

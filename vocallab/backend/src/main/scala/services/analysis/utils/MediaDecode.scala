package services.analysis.utils

import cats.effect.{IO, Ref}
import io.circe.{Json, JsonObject}
import java.nio.file.{Files, Path}
import java.util.UUID
import scala.concurrent.duration.*
import org.http4s.Status
import services.analysis.objects.{MediaFormat, MediaMetadata}
import services.system.objects.ApiError

private[analysis] object MediaDecode:
  private def number(field: Option[Json]): Option[Double] =
    field.flatMap(value => value.asNumber.map(_.toDouble).orElse(value.asString.flatMap(_.toDoubleOption))).filter(_.isFinite)

  private def inputOptions(demuxer: String): List[String] =
    if demuxer == "mov" then List("-f", "mov", "-enable_drefs", "0", "-use_absolute_path", "0")
    else List("-f", demuxer)

  private def probe(path: Path, demuxer: String): IO[Json] =
    for
      output <- Ref.of[IO, Vector[String]](Vector.empty)
      exit <- Command.run(List("ffprobe", "-v", "error", "-protocol_whitelist", "file,pipe",
        "-max_alloc", "134217728") ++ inputOptions(demuxer) ++ List("-show_entries",
        "format=duration,start_time:stream=index,codec_type,start_time,sample_rate,channels:stream_disposition=default,attached_pic",
        "-of", "json", path.toString), path.getParent, 25.seconds,
        line => output.update(lines => if lines.size < 8192 then lines :+ line else lines))
      lines <- output.get
      json <- IO.fromEither(io.circe.parser.parse(lines.mkString("\n")).left.map(_ => invalid))
      _ <- IO.raiseUnless(exit == 0)(invalid)
    yield json

  private def invalid: ApiError = ApiError(Status.UnprocessableEntity, "无法读取媒体。请确认格式与扩展名一致，文件完整并含有可解码音轨。")

  def upload(path: Path, decoded: Path, id: UUID, name: String, format: MediaFormat,
             size: Long): IO[MediaMetadata] =
    val demuxer = format match
      case MediaFormat.wav => "wav"
      case MediaFormat.mp3 => "mp3"
      case MediaFormat.m4a | MediaFormat.mp4 | MediaFormat.mov => "mov"
    for
      info <- probe(path, demuxer)
      streams = info.hcursor.get[Vector[JsonObject]]("streams").getOrElse(Vector.empty)
      audio = streams.filter(_("codec_type").flatMap(_.asString).contains("audio"))
      isDefault = (stream: JsonObject) => stream("disposition").flatMap(_.asObject).flatMap(_("default")).flatMap(_.asNumber).flatMap(_.toInt).contains(1)
      track <- IO.fromOption(audio.find(isDefault).orElse(audio.headOption))(
        ApiError(Status.UnprocessableEntity, "文件没有音轨。"))
      hasVideo = streams.exists(stream => stream("codec_type").flatMap(_.asString).contains("video") &&
        !stream("disposition").flatMap(_.asObject).flatMap(_("attached_pic")).flatMap(_.asNumber).flatMap(_.toInt).contains(1))
      _ <- IO.raiseWhen(hasVideo && format == MediaFormat.m4a)(invalid)
      stream <- IO.fromOption(number(track("index")).map(_.toInt))(invalid)
      channels <- IO.fromOption(number(track("channels")).map(_.toInt).filter(n => n >= 1 && n <= 16))(invalid)
      rate <- IO.fromOption(number(track("sample_rate")).map(_.toInt).filter(n => n >= 4000 && n <= 192000))(invalid)
      formatInfo = info.hcursor.downField("format").focus.flatMap(_.asObject)
      origin = number(formatInfo.flatMap(_("start_time"))).getOrElse(0.0)
      audioStart = number(track("start_time")).getOrElse(origin) - origin
      exit <- Command.run(List("ffmpeg", "-hide_banner", "-v", "error", "-nostdin", "-xerror",
        "-protocol_whitelist", "file,pipe", "-max_alloc", "134217728", "-threads", "2",
        "-err_detect", "explode") ++ inputOptions(demuxer) ++ List("-copyts", "-start_at_zero", "-i", path.toString,
        "-map", s"0:$stream", "-vn", "-sn", "-dn", "-map_metadata", "-1",
        "-af", "aresample=async=1:first_pts=0", "-ac", math.min(channels, 2).toString, "-ar", rate.toString,
        "-threads", "2", "-c:a", "flac", "-compression_level", "2",
        decoded.toString), path.getParent, 110.seconds, _ => IO.unit)
      exists <- IO.blocking(Files.isRegularFile(decoded))
      _ <- IO.raiseUnless(exit == 0 && exists)(invalid)
      converted <- probe(decoded, "flac")
      duration <- IO.fromOption(converted.hcursor.downField("format").focus.flatMap(_.asObject)
        .flatMap(obj => number(obj("duration"))).filter(_ >= 0.25))(invalid)
    yield MediaMetadata(id, name, format, duration, size, rate, channels, stream, audio.size, audioStart, hasVideo)

  def clip(input: Path, output: Path, start: Double, duration: Double, separate: Boolean): IO[Unit] =
    val pcm = if separate then List("-ar", "44100", "-ac", "2") else Nil
    Command.run(List("ffmpeg", "-v", "error", "-nostdin", "-xerror", "-protocol_whitelist", "file,pipe",
      "-ss", start.toString, "-f", "flac", "-i", input.toString, "-map", "0:a:0", "-t", duration.toString,
      "-c:a", "pcm_s16le") ++ pcm ++ List(output.toString), output.getParent,
      45.seconds, _ => IO.unit).flatMap(status => IO.raiseUnless(status == 0)(
        ApiError(Status.UnprocessableEntity, "无法截取音轨。请检查媒体和所选区间。")))

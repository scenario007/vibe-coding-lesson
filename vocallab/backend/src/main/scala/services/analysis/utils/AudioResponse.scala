package services.analysis.utils

import cats.effect.IO
import fs2.io.file.{Files as FsFiles, Path as FsPath}
import java.nio.file.{Files, Path}
import org.http4s.*
import org.typelevel.ci.CIString

private[analysis] object AudioResponse:
  def stream(request: Request[IO], path: Path, mime: String): IO[Response[IO]] =
    IO.blocking(Files.size(path)).map { size =>
      val common = Headers(Header.Raw(CIString("Accept-Ranges"), "bytes"),
        Header.Raw(CIString("Content-Type"), mime))
      val range = request.headers.get(CIString("Range")).map(_.head.value)
      val file = FsPath.fromNioPath(path)
      range match
        case None =>
          Response[IO](Status.Ok, headers = common.put(Header.Raw(CIString("Content-Length"), size.toString)),
            body = FsFiles[IO].readAll(file))
        case Some(value) =>
          parse(value, size) match
            case Some((start, end)) =>
              Response[IO](Status.PartialContent, headers = common.put(
                Header.Raw(CIString("Content-Range"), s"bytes $start-$end/$size"),
                Header.Raw(CIString("Content-Length"), (end - start + 1).toString)),
                body = FsFiles[IO].readRange(file, 65536, start, end + 1))
            case None =>
              Response[IO](Status.RangeNotSatisfiable, headers =
                common.put(Header.Raw(CIString("Content-Range"), s"bytes */$size")))
    }

  private def parse(header: String, size: Long): Option[(Long, Long)] =
    val bytes = "^bytes=([0-9]*)-([0-9]*)$".r
    header match
      case bytes("", suffix) =>
        suffix.toLongOption.filter(_ > 0).map(amount => (math.max(0, size - amount), size - 1))
      case bytes(first, last) =>
        for
          start <- first.toLongOption.filter(_ < size)
          end <- (if last.isEmpty then Some(size - 1) else last.toLongOption.map(math.min(_, size - 1))).filter(_ >= start)
        yield (start, end)
      case _ => None

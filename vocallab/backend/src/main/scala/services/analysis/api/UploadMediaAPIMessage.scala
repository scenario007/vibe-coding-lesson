package services.analysis.api

import cats.effect.IO
import fs2.Stream
import fs2.io.file.{Files as FsFiles, Path as FsPath}
import java.nio.file.Files
import java.sql.Connection
import java.util.{Locale, UUID}
import org.http4s.Status
import services.analysis.objects.*
import services.analysis.tables.MediaTable.MediaTable
import services.analysis.utils.{LocalFiles, MediaDecode}
import services.system.api.APIMessage
import services.system.objects.{ApiError, AppConfig}

final case class UploadMediaAPIMessage(filename: String, body: Stream[IO, Byte], config: AppConfig)
    extends APIMessage[MediaMetadata]:
  def plan(connection: Connection): IO[MediaMetadata] =
    val name = filename.filterNot(_.isControl).replace('\\', '/').split('/').lastOption.getOrElse("").takeRight(200)
    val extension = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)
    for
      format <- IO.fromEither(MediaFormat.fromString(extension).left.map(_ =>
        ApiError(Status.UnsupportedMediaType, "请选择 WAV、MP3、M4A、MP4 或 MOV。")))
      _ <- IO.raiseUnless(name.contains('.'))(ApiError(Status.UnsupportedMediaType, "文件缺少支持的扩展名。"))
      id <- IO.delay(UUID.randomUUID())
      directory = LocalFiles.media(config, id)
      source = directory.resolve(s"source.$format")
      decoded = directory.resolve("audio.flac")
      metadata <- (for
        _ <- IO.blocking(Files.createDirectory(directory))
        _ <- body.take(config.maxBytes + 1).through(FsFiles[IO].writeAll(FsPath.fromNioPath(source))).compile.drain
        bytes <- IO.blocking(Files.size(source))
        _ <- IO.raiseWhen(bytes > config.maxBytes)(ApiError(Status.PayloadTooLarge, s"单个文件最多 ${config.maxBytes / 1048576} MiB。"))
        _ <- IO.raiseWhen(bytes < 16)(ApiError(Status.UnprocessableEntity, "文件为空或不完整。"))
        info <- MediaDecode.upload(source, decoded, id, name, format, bytes)
        digest <- LocalFiles.hash(source)
      yield StoredMedia(info, digest)).onError { case _ => LocalFiles.remove(directory) }.onCancel(LocalFiles.remove(directory))
      _ <- MediaTable.insert(connection, metadata).onError { case _ => LocalFiles.remove(directory) }.uncancelable
    yield metadata.metadata

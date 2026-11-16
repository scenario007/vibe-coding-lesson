package services.system.objects

import java.nio.file.Path

final case class AppConfig(
  root: Path,
  runData: Path,
  models: Path,
  python: Path,
  port: Int,
  frontendPort: Int,
  maxBytes: Long,
  maxDuration: Int,
  maxClip: Int,
  workerSeconds: Int,
  mediaHours: Int,
  cacheDays: Int
)

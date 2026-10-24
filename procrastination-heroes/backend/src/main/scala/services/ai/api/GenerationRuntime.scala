package services.ai.api

import cats.effect.{IO, Resource}
import services.ai.utils.GenerationWorker

/** Public lifecycle boundary; the worker acquires its own short-lived transactions. */
object GenerationRuntime:
  def background: Resource[IO, Unit] =
    Resource.make(GenerationWorker.run.start)(_.cancel).map(_ => ())

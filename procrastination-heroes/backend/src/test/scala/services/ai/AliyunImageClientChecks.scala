package services.ai

import cats.effect.{IO, IOApp}
import services.ai.objects.ImageAssetKind
import services.ai.utils.AliyunImageClient

object AliyunImageClientChecks extends IOApp.Simple:
  def run: IO[Unit] =
    for
      reward <- AliyunImageClient.generate(ImageAssetKind.reward, "任务主题：完成论文初稿；等级：challenge；奖励：稿纸剑", "mock-reward")
      _ <- IO(assert(reward.contains("/generated/reward/mock-reward.original.png")))
      _ <- IO.println("PASS: reward image response were downloaded locally")
    yield ()

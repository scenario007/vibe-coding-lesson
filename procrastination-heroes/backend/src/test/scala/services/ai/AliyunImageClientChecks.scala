package services.ai

import cats.effect.{IO, IOApp}
import services.ai.objects.ImageAssetKind
import services.ai.utils.AliyunImageClient

object AliyunImageClientChecks extends IOApp.Simple:
  def run: IO[Unit] =
    for
      reward <- AliyunImageClient.generate(ImageAssetKind.reward, "任务主题：完成论文初稿；等级：challenge；奖励：稿纸剑", "mock-reward")
      furniture <- AliyunImageClient.generate(ImageAssetKind.furniture, "用户想要的家具：会提醒我喝水的小桌子", "mock-furniture")
      _ <- IO(assert(reward.contains("/generated/reward/mock-reward.original.png")))
      _ <- IO(assert(furniture.contains("/generated/furniture/mock-furniture.original.png")))
      _ <- IO.println("PASS: reward and furniture image responses were downloaded locally")
    yield ()

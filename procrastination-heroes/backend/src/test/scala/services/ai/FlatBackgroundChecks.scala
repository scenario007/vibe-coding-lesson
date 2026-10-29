package services.ai

import cats.effect.{IO, IOApp}
import java.awt.image.BufferedImage
import java.nio.file.Files
import javax.imageio.ImageIO
import services.ai.utils.FlatBackground

object FlatBackgroundChecks extends IOApp.Simple:
  def run: IO[Unit] = IO.blocking {
    val dir = Files.createTempDirectory("guild-background-check")
    val source = dir.resolve("original.png")
    val output = dir.resolve("cutout.png")
    val image = BufferedImage(40,40,BufferedImage.TYPE_INT_ARGB)
    (0 until 40).foreach(y => (0 until 40).foreach(x => image.setRGB(x,y,if x >= 10 && x < 30 && y >= 10 && y < 30 then 0xff4444cc.toInt else 0xffffffff.toInt)))
    ImageIO.write(image,"png",source.toFile)
    assert(FlatBackground.remove(source,output))
    val result = ImageIO.read(output.toFile)
    assert((result.getRGB(0,0) >>> 24) == 0)
    assert((result.getRGB(15,15) >>> 24) == 255)
    assert((ImageIO.read(source.toFile).getRGB(0,0) >>> 24) == 255)
    image.setRGB(0,0,0xff000000.toInt)
    (0 until 40).foreach(x => image.setRGB(x,0,0xff000000.toInt))
    ImageIO.write(image,"png",source.toFile)
    assert(!FlatBackground.remove(source,output))
    println("PASS: white background removed, subject and original preserved; non-white edge rejected")
  }

package services.ai.utils

import java.nio.file.Path
import javax.imageio.ImageIO
import java.awt.image.BufferedImage
import java.util.{ArrayDeque, BitSet}
import scala.annotation.tailrec

/** Remove only near-white pixels connected to a nearly uniform white image edge. */
private[ai] object FlatBackground:
  private def white(pixel: Int): Boolean =
    ((pixel >>> 16) & 255) >= 246 && ((pixel >>> 8) & 255) >= 246 && (pixel & 255) >= 246

  private[ai] def remove(source: Path, destination: Path): Boolean =
    val image = ImageIO.read(source.toFile)
    if image == null || image.getWidth < 10 || image.getHeight < 10 || image.getWidth > 4096 || image.getHeight > 4096 then false
    else
      val width = image.getWidth
      val height = image.getHeight
      val edges = (0 until width).flatMap(x => List((x,0),(x,height-1))) ++ (1 until height-1).flatMap(y => List((0,y),(width-1,y)))
      if edges.count((x,y) => white(image.getRGB(x,y))).toDouble / edges.size < 0.9 then false
      else
        val visited = BitSet(width * height)
        val queue = ArrayDeque[Int]()
        def enqueue(x: Int, y: Int): Unit =
          val index = y * width + x
          if x >= 0 && x < width && y >= 0 && y < height && !visited.get(index) && white(image.getRGB(x,y)) then
            visited.set(index)
            queue.add(index)
        edges.foreach((x,y) => enqueue(x,y))
        @tailrec def visit(): Unit =
          if !queue.isEmpty then
            val index = queue.remove()
            val x = index % width
            val y = index / width
            enqueue(x-1,y); enqueue(x+1,y); enqueue(x,y-1); enqueue(x,y+1)
            visit()
        visit()
        val ratio = visited.cardinality().toDouble / (width.toDouble * height)
        if ratio < 0.05 || ratio > 0.90 then false
        else
          val out = BufferedImage(width,height,BufferedImage.TYPE_INT_ARGB)
          (0 until height).foreach(y => (0 until width).foreach { x =>
            val pixel = image.getRGB(x,y)
            out.setRGB(x,y,if visited.get(y*width+x) then pixel & 0x00ffffff else pixel)
          })
          ImageIO.write(out,"png",destination.toFile)

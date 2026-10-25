package services.ai.utils
import cats.effect.IO
import java.nio.file.{Files,Path}
import io.circe.parser.parse
import services.ai.objects.apiTypes.AssetUsage
import services.ai.objects.AssetStatus
private[ai] object AssetLedger:
  private[ai] def read: IO[List[AssetUsage]] = IO.blocking {
    val path=Path.of(sys.env.getOrElse("TOKENHUB_ART_MANIFEST","../frontend/public/assets/guild-v2/manifest.json"))
    if !Files.exists(path) then Nil
    else
      val json=parse(Files.readString(path)).fold(throw _,identity)
      json.hcursor.downField("assets").focus.flatMap(_.asArray).getOrElse(Vector.empty).toList.map { v =>
        val c=v.hcursor
        AssetUsage(c.get[String]("name").getOrElse("asset"),c.get[String]("model").getOrElse("unknown"),AssetStatus.fromString(c.get[String]("status").getOrElse("unconfirmed")).getOrElse(AssetStatus.unconfirmed),c.get[Long]("tokens").toOption,c.get[BigDecimal]("estimatedCny").getOrElse(BigDecimal("0.12")))
      }
  }

package services.game.objects
import io.circe.{Decoder,Encoder}
import io.circe.generic.semiauto.*
final case class Evidence(text: String, kind: EvidenceKind, source: String, discoveredHour: Option[Int])
object Evidence:
  given Encoder[Evidence] = deriveEncoder
  given Decoder[Evidence] = deriveDecoder
  def fromText(text: String,hour: Option[Int]): Evidence =
    if text.startsWith("药师证词") then Evidence(text,EvidenceKind.testimony,"药师林婆",hour)
    else if text.startsWith("证词：") then Evidence(text,EvidenceKind.testimony,text.drop(3).takeWhile(c=>c!='承' && c!='表'),hour)
    else if text.startsWith("诊所记录") then Evidence(text,EvidenceKind.document,"诊所书面记录",hour)
    else if text.startsWith("铁匠旧图") || text.startsWith("矿工来信") || text.startsWith("补给清单") || text.startsWith("档案残页") || text.startsWith("档案补页") || text.startsWith("会议记录") || text.startsWith("药剂账册") || text.startsWith("铁匠铺工单") then Evidence(text,EvidenceKind.document,"发现的书面材料",hour)
    else if text.startsWith("矿洞报告") || text.startsWith("矿洞记录") then Evidence(text,EvidenceKind.document,"矿洞书面记录",hour)
    else if text.startsWith("封锁告示") then Evidence(text,EvidenceKind.document,"村口告示",hour)
    else Evidence(text,EvidenceKind.observation,"玩家观察或行动",hour)

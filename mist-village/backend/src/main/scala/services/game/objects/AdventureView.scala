package services.game.objects
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.*
final case class AdventureView(id: String, name: String, role: String, difficulty: String, hour: Int, place: String, health: Int, fatigue: Int, clues: List[String], events: List[String], stage: Int, sealedEnding: Boolean, npcs: List[NpcView], quests: List[Quest], aiEnabled: Boolean, dead: Boolean, notes: List[JournalNote], dialogue: List[DialogueEntry], money: Int, items: List[ItemStack], mode: String, profile: Option[PlayerProfile], companion: Option[String], stats: PlayerStats, injury: Option[String], aiPause: Option[AiPause], pendingRecovery: Option[Recovery], battle: Option[Battle], knownMinerStatus: MinerStatus, evidence: List[Evidence], importantClues: List[Int])
object AdventureView:
  given Encoder[AdventureView] = deriveEncoder
  given Decoder[AdventureView] = deriveDecoder
  def from(a: Adventure): AdventureView = AdventureView(a.id,a.name,a.role,a.difficulty,a.hour,a.place,a.health,a.fatigue,a.clues,a.events,a.stage,a.sealedEnding,a.npcs.filter(_.met).map(n => NpcView(n.id,n.name,NpcView.attitudeFor(n.knownTrust.getOrElse(n.trust)),n.lastKnownPlace,n.memories,n.lastSeenHour,n.knownCondition)),a.quests,a.aiEnabled,a.dead,a.notes,a.dialogue,a.money,a.items,a.mode,a.profile,a.companion,a.stats.getOrElse(PlayerStats.forRole(a.role)),a.injury,a.aiPause,a.pendingRecovery,a.battle,a.knownMinerStatus,a.evidence,a.importantClues)

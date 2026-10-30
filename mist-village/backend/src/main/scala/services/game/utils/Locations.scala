package services.game.utils
import services.game.objects.Adventure
private[game] object Locations:
  private[game] val village = Set("gate","clinic","forge","hall")
  private[game] val all = village ++ Set("forest","mine","camp")
  private[game] val names = List("gate"->"村口","clinic"->"诊所","forge"->"铁匠铺","hall"->"议事厅","forest"->"森林","mine"->"矿洞","camp"->"营地")
  private[game] def safe(a: Adventure): Boolean = village.contains(a.place) || (a.place == "camp" && a.hour < a.campSafeUntil)

  private[game] def travelHours(a: Adventure, destination: String): Int =
    val base=if village.contains(a.place) && village.contains(destination) then 1 else 2
    val exposed=Set("forest","mine","camp").contains(a.place) || Set("forest","mine","camp").contains(destination)
    val fog=if exposed && a.hour>=57 then 2 else if exposed && a.hour>=33 then 1 else 0
    base+fog+(if a.injury.contains("leg") then 1 else 0)

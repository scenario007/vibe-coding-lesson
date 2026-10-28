import { GetBaseAPI } from '@/apis/economy/GetBaseAPI'
import { PlaceItemAPI } from '@/apis/economy/PlaceItemAPI'
import { PurchaseStoreItemAPI } from '@/apis/economy/PurchaseStoreItemAPI'
import { CreateCustomFurnitureAPI } from '@/apis/economy/CreateCustomFurnitureAPI'
import type { RoomSlot } from '@/objects/economy/RoomSlot'
import type { RewardSymbol } from '@/objects/economy/RewardSymbol'
import type { RewardPalette } from '@/objects/economy/RewardPalette'
import { useResource } from '@/system/hooks/useResource'
import { setProgress, touchPlayer, usePlayer } from '@/system/stores/player'
import { useState } from 'react'
export function useBaseInventory() {
  const { revision } = usePlayer()
  const resource = useResource(() => new GetBaseAPI().send(), [revision])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function purchase(id: string) {
    setBusy(true)
    setError('')
    try {
      const data = await new PurchaseStoreItemAPI(id).send()
      resource.setState({ status: 'ready', data })
      setProgress(data.progress)
      setNotice('它已经放进背包，去小屋摆好吧。')
      touchPlayer()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '购买未完成')
      return false
    } finally {
      setBusy(false)
    }
  }
  async function place(slot: RoomSlot, itemId: string | null, rewardId: string | null) {
    setBusy(true)
    setError('')
    try {
      const data = await new PlaceItemAPI(slot, itemId, rewardId).send()
      resource.setState({ status: 'ready', data })
      setNotice('小屋已经保存，下次回来它还在。')
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '摆放未完成')
      return false
    } finally {
      setBusy(false)
    }
  }
  async function customize(
    prompt: string,
    slot: RoomSlot,
    symbol: RewardSymbol,
    palette: RewardPalette,
  ) {
    setBusy(true)
    setError('')
    try {
      const data = await new CreateCustomFurnitureAPI(prompt, slot, symbol, palette).send()
      resource.setState({ status: 'ready', data })
      setProgress(data.progress)
      setNotice('定制家具已生成并放进素材库，去据点自由摆放吧。')
      touchPlayer()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '定制未完成')
      return false
    } finally {
      setBusy(false)
    }
  }
  return { ...resource, busy, error, notice, purchase, place, customize }
}

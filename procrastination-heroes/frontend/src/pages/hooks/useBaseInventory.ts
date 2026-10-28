import { GetBaseAPI } from '@/apis/economy/GetBaseAPI'
import { PlaceItemAPI } from '@/apis/economy/PlaceItemAPI'
import { PurchaseStoreItemAPI } from '@/apis/economy/PurchaseStoreItemAPI'
import { CreateCustomFurnitureAPI } from '@/apis/economy/CreateCustomFurnitureAPI'
import { MovePlacementAPI } from '@/apis/economy/MovePlacementAPI'
import type { RoomSlot } from '@/objects/economy/RoomSlot'
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
  async function place(slot: string, itemId: string | null, rewardId: string | null) {
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
  async function move(id: string, x: number, y: number) {
    setBusy(true)
    setError('')
    try {
      const data = await new MovePlacementAPI(id, x, y).send()
      resource.setState({ status: 'ready', data })
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '移动未完成')
      return false
    } finally {
      setBusy(false)
    }
  }
  async function customize(prompt: string, slot: RoomSlot) {
    setBusy(true)
    setError('')
    try {
      const previous = new Set(
        resource.state.status === 'ready' ? resource.state.data.owned.map((item) => item.id) : [],
      )
      const data = await new CreateCustomFurnitureAPI(prompt, slot).send()
      const created = data.owned.find((item) => !previous.has(item.id))
      const imageUrl = data.items.find((item) => item.id === created?.itemId)?.imageUrl
      resource.setState({ status: 'ready', data })
      setProgress(data.progress)
      setNotice(
        imageUrl
          ? 'AI 家具图片已生成并放进素材库，去据点自由摆放吧。'
          : '家具已放进素材库；图片服务未配置或暂时不可用，当前显示公会手绘部件。',
      )
      touchPlayer()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '定制未完成')
      return false
    } finally {
      setBusy(false)
    }
  }
  return { ...resource, busy, error, notice, purchase, place, move, customize }
}

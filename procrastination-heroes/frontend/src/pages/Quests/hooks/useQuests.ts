import { ListQuestsAPI } from '@/apis/quests/ListQuestsAPI'
import { useResource } from '@/system/hooks/useResource'
import { usePlayer } from '@/system/stores/player'
import { useState } from 'react'
export function useQuests() {
  const { revision } = usePlayer()
  const resource = useResource(() => new ListQuestsAPI().send(), [revision])
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const quests = resource.state.status === 'ready' ? resource.state.data : []
  const filtered = quests.filter(
    (q) =>
      (filter === 'all' || q.quest.status === filter) &&
      (category === 'all' || q.quest.category === category) &&
      q.quest.title.toLowerCase().includes(search.toLowerCase()),
  )
  return {
    ...resource,
    filter,
    setFilter,
    search,
    setSearch,
    category,
    setCategory,
    quests,
    filtered,
  }
}

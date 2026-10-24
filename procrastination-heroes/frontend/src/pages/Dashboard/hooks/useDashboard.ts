import { GetDashboardAPI } from '@/apis/adventure/GetDashboardAPI'
import { useResource } from '@/system/hooks/useResource'
import { usePlayer } from '@/system/stores/player'
export function useDashboard() {
  const { revision } = usePlayer()
  return useResource(() => new GetDashboardAPI().send(), [revision])
}

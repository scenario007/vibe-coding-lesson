import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { bootPlayer } from './system/stores/player'
function App() {
  useEffect(() => {
    void bootPlayer()
  }, [])
  return <RouterProvider router={router} />
}
const root = createRoot(document.getElementById('root')!)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

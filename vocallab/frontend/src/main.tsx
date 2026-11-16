import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AudioWaveform, LockKeyhole } from 'lucide-react'
import Studio from './pages/Studio'
import Report from './pages/Report'
import './styles.css'

function App() {
  return <BrowserRouter>
    <header className="border-b border-line bg-[#13151b]">
      <div className="mx-auto flex h-[68px] max-w-[1192px] items-center justify-between px-5 sm:px-9">
        <Link to="/" className="inline-flex items-center gap-2.5 text-xl font-bold tracking-[-0.035em] text-ink" aria-label="VocalLab 首页">
          <span className="grid size-9 place-items-center rounded-[10px] bg-accent text-[#21163b]"><AudioWaveform size={21} strokeWidth={2.5}/></span> VocalLab
        </Link>
        <span className="flex items-center gap-2 text-xs text-muted"><LockKeyhole size={14} className="text-mint"/> 录音在本机处理</span>
      </div>
    </header>
    <main className="mx-auto max-w-[1192px] px-5 py-9 sm:px-9 sm:py-12">
      <Routes>
        <Route path="/" element={<Studio/>}/>
        <Route path="/analysis/:id" element={<Report/>}/>
        <Route path="*" element={<Link className="text-accent underline" to="/">返回 VocalLab 首页</Link>}/>
      </Routes>
    </main>
  </BrowserRouter>
}
const root = document.getElementById('root')
if (!root) throw new Error('VocalLab root element is missing')
createRoot(root).render(<App/>)

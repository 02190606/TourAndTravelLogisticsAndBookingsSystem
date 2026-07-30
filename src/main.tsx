import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const RELOAD_KEY = 'oc_rl'
const RELOAD_THROTTLE = 10_000

function isChunkError(msg: string): boolean {
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk|Importing a module script failed/i.test(msg)
}

function silentReload(): void {
  const now = Date.now()
  const last = parseInt(sessionStorage.getItem(RELOAD_KEY) ?? '0', 10)
  if (now - last > RELOAD_THROTTLE) {
    sessionStorage.setItem(RELOAD_KEY, String(now))
    window.location.reload()
  }
}

window.addEventListener('error', (e) => {
  if (isChunkError(e.message ?? '')) {
    e.preventDefault()
    silentReload()
  }
})

window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message ?? String(e.reason)
  if (isChunkError(msg)) {
    e.preventDefault()
    silentReload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

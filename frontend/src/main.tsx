import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { IS_V2_PREVIEW } from './config/buildVariant.ts'
import './styles/base.css'
import './App.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

console.info('[E23_STARTUP] WEB_READY')

if (IS_V2_PREVIEW) {
  const persistenceKey = 'E23_STARTUP_PERSISTENCE_V1'
  const previous = Number.parseInt(localStorage.getItem(persistenceKey) ?? '0', 10)
  const current = Number.isFinite(previous) ? previous + 1 : 1
  localStorage.setItem(persistenceKey, String(current))
  console.info(`[E23_STARTUP] PERSISTENCE_READY ${current}`)

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
        console.warn('[E23_PWA] Service worker registration failed', error)
      })
    })
  }
}

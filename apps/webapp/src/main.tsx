import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tailwind.css'
import './styles/sheets.css'

function Boot() {
  useEffect(() => {
    // Telegram WebApp: раскрыть, подхватить тему
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.expand()
      tg.setHeaderColor('secondary_bg_color')
      tg.setBackgroundColor('secondary_bg_color')
    }
    // iOS safe-area
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)')
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)')
  }, [])
  return <App />
}

createRoot(document.getElementById('root')!).render(<Boot />)

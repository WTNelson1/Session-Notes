import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import { initBackground } from '@personal-os/kit'
import App from './App'
import './index.css'

// Brass constellations over dark water. Fewer nodes than Helm — mobile-first.
initBackground({
  accent: [232, 182, 76],
  count: 48,
  linkDist: 180,
  baseAlpha: 0.1,
  scrollAlpha: 0.16,
  nodeAlpha: 0.35,
  nodeAlphaScroll: 0.35,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

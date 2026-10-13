import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { decodeProject } from './utils/shareLink'
import { loadSaved, saveLocal } from './utils/projectFile'

/** Opens a shared link (if there is one), then starts the app. */
async function boot() {
  const shared = new URLSearchParams(window.location.search).get('p')
  if (shared) {
    const file = await decodeProject(shared)
    // Take the data out of the address bar so a refresh doesn't ask again.
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    if (!file) {
      window.alert("That share link couldn't be read. It may have been cut short when it was copied.")
    } else if (
      !loadSaved() ||
      window.confirm('Open the shared project? It will replace the project saved in this browser. Save a file first if you want to keep that one.')
    ) {
      saveLocal(file)
    }
  }
  // Loaded after the link is handled, because the app reads the saved project when it starts.
  const { default: App } = await import('./App.tsx')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()

// Offline support, only in the built site (the dev server would cache stale code).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* the app still works online without it */
    })
  })
}

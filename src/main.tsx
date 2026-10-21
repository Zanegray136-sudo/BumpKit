import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import Hub from './components/Hub'
import './index.css'
import { decodeProject } from './utils/shareLink'
import { startSharedView } from './utils/sharedView'

/** The hub is the front door: an empty address, or #/hub. Any page of the LED planner goes straight to it. */
const SignalPage = lazy(() => import('./components/SignalPage'))
const isSignal = () => window.location.hash === '#/signal'
const isHub = () => /^#?\/?(hub)?$/.test(window.location.hash)

function Root({ App }: { App: ComponentType }) {
  const [route, setRoute] = useState(() => (isSignal() ? 'signal' : isHub() ? 'hub' : 'app'))
  useEffect(() => {
    const on = () => setRoute(isSignal() ? 'signal' : isHub() ? 'hub' : 'app')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  if (route === 'signal') {
    return (
      <Suspense fallback={null}>
        <SignalPage />
      </Suspense>
    )
  }
  return route === 'hub' ? <Hub /> : <App />
}

/** Opens a shared link (if there is one), then starts the app. */
async function boot() {
  const shared = new URLSearchParams(window.location.search).get('p')
  if (shared) {
    const file = await decodeProject(shared)
    // Take the data out of the address bar so a refresh doesn't ask again.
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    if (!file) {
      window.alert("That share link couldn't be read. It may have been cut short when it was copied.")
    } else {
      // Open it for viewing. The project saved in this browser is left alone.
      startSharedView(file)
      // A shared project opens in the planner, not the hub.
      if (isHub()) window.location.hash = '/project'
    }
  }
  // Loaded after the link is handled, because the app reads the saved project when it starts.
  const { default: App } = await import('./App.tsx')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root App={App} />
    </StrictMode>,
  )
}

void boot()

// Offline support, only in the built site (the dev server would cache stale code).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // If a new version takes over a page that was already open, offer a reload.
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) window.dispatchEvent(new Event('pixelplan-update'))
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* the app still works online without it */
    })
  })
}

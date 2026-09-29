import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import { checkSupabaseConnection } from './lib/supabase'

if (import.meta.env.DEV) {
  void checkSupabaseConnection().then((result) => {
    if (result.connected) {
      console.info('[JalDrishti] Supabase connection successful.', { status: result.status })
    } else {
      console.error('[JalDrishti] Supabase connection failed.', result.message, {
        status: result.status,
      })
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

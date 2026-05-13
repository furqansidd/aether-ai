import { createClient } from '@supabase/supabase-js'

// Try to use Vite env vars if available, otherwise fallback (e.g. for testing)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Simple event bus for cross-component communication ──
// Used so that when Sidebar deletes a file, Dashboard can refresh its data.
const dataListeners = new Set()

export const datasetsEvents = {
  subscribe(callback) {
    dataListeners.add(callback)
    return () => dataListeners.delete(callback)
  },
  emit() {
    dataListeners.forEach(cb => cb())
  },
}

// ── Session event bus ──
// Emitted on logout so ChatInterface can clear its local messages state
// before the auth session is destroyed.
const sessionListeners = new Set()

export const sessionEvents = {
  subscribe(callback) {
    sessionListeners.add(callback)
    return () => sessionListeners.delete(callback)
  },
  emit(eventName) {
    sessionListeners.forEach(cb => cb(eventName))
  },
}

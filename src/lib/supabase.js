import { createClient } from '@supabase/supabase-js'

// Try to use Vite env vars if available, otherwise fallback (e.g. for testing)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Simple event bus for cross-component communication ──
// Used so that when Sidebar deletes a file, Dashboard can refresh its data.
const listeners = new Set()

export const datasetsEvents = {
  subscribe(callback) {
    listeners.add(callback)
    return () => listeners.delete(callback)
  },
  emit() {
    listeners.forEach(cb => cb())
  },
}

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, sessionEvents } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    // 1. Signal all subscribers (e.g. ChatInterface) to clear local messages NOW
    //    before the session is destroyed — this gives components a chance to
    //    wipe their React state while user_id is still available if needed.
    sessionEvents.emit('signout')

    // 2. Clear ALL cached chat messages from localStorage so they don't
    //    rehydrate on the next login on this device. Supabase is the source
    //    of truth; localStorage is only a write-through cache.
    Object.keys(localStorage)
      .filter(key => key.startsWith('aether_chat_'))
      .forEach(key => localStorage.removeItem(key))

    // 3. Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    if (!error) setUser(null)
    return { error }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

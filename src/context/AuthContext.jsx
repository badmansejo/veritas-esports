import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null)
      return null
    }

    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error(
        'VERITAS profile load error:',
        error
      )

      setProfile(null)
      return null
    }

    setProfile(data)

    return data
  }

  async function refreshProfile() {
    if (!user?.id) return null

    return await loadProfile(user.id)
  }

  async function signIn({
    email,
    password,
  }) {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  }

  async function signUp({
    email,
    password,
    username,
  }) {
    const cleanEmail =
      email.trim().toLowerCase()

    const cleanUsername =
      username.trim()

    /*
     * The database trigger creates the profile
     * automatically when auth.users is created.
     */
    return await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
        },
      },
    })
  }

  async function signOut() {
    const { error } =
      await supabase.auth.signOut()

    if (error) {
      throw error
    }

    setSession(null)
    setUser(null)
    setProfile(null)
  }

  async function updateProfile({
    username = null,
    avatar_url = null,
  }) {
    const { data, error } =
      await supabase.rpc(
        'update_my_profile',
        {
          p_username: username,
          p_avatar_url: avatar_url,
        }
      )

    if (error) {
      throw error
    }

    setProfile(data)

    return data
  }

  useEffect(() => {
    let mounted = true

    async function initialize() {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error(
            'VERITAS session error:',
            error
          )
        }

        if (!mounted) return

        const currentSession =
          data?.session || null

        setSession(currentSession)

        setUser(
          currentSession?.user || null
        )

        if (currentSession?.user) {
          await loadProfile(
            currentSession.user.id
          )
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error(
          'VERITAS auth initialization error:',
          error
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initialize()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          newSession
        ) => {
          if (!mounted) return

          console.log(
            'VERITAS AUTH EVENT:',
            event
          )

          setSession(newSession)

          setUser(
            newSession?.user || null
          )

          if (
            newSession?.user
          ) {
            /*
             * Avoid doing heavy profile work
             * for every auth event.
             */
            if (
              event ===
                'SIGNED_IN' ||
              event ===
                'USER_UPDATED'
            ) {
              setTimeout(() => {
                if (mounted) {
                  loadProfile(
                    newSession.user.id
                  )
                }
              }, 0)
            }
          } else {
            setProfile(null)
          }

          setLoading(false)
        }
      )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    loadProfile,
    refreshProfile,
    updateProfile,
    isAuthenticated:
      !!session,
    isAdmin:
      profile?.is_admin === true,
  }

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context =
    useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    )
  }

  return context
}
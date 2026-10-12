import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function UserHeartbeat() {
  useEffect(() => {
    let stopped = false
    let activeUserId = null
    let busy = false

    const updateActivity = async () => {
      if (stopped || busy) return

      busy = true

      try {
        const { data, error } = await supabase.auth.getSession()

        if (error || stopped) return

        const userId = data?.session?.user?.id

        if (!userId) {
          activeUserId = null
          return
        }

        activeUserId = userId

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', userId)

        if (updateError) {
          console.error('VERITAS activity update failed:', updateError.message)
        }
      } catch (error) {
        console.error('VERITAS activity tracking error:', error)
      } finally {
        busy = false
      }
    }

    updateActivity()

    const interval = window.setInterval(updateActivity, 30000)

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user?.id) {
          activeUserId = null
        } else if (session.user.id !== activeUserId) {
          window.setTimeout(updateActivity, 0)
        }
      }
    )

    return () => {
      stopped = true
      window.clearInterval(interval)
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  return null
}

import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function UserHeartbeat() {
  useEffect(() => {
    let stopped = false
    let busy = false

    const updateActivity = async () => {
      if (stopped || busy) return
      busy = true

      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('VERITAS Last Seen: session error:', error.message)
          return
        }

        if (stopped) return

        const user = data?.session?.user

        if (!user?.id) {
          console.log('VERITAS Last Seen: no logged-in user')
          return
        }

        console.log('VERITAS Last Seen: updating account', user.email)

        const { error: updateError } = await supabase.rpc(
          'update_my_last_seen'
        )

        if (updateError) {
          console.error('VERITAS Last Seen: RPC failed:', updateError)
          return
        }

        console.log('VERITAS Last Seen: RPC succeeded for', user.email)
      } catch (error) {
        console.error('VERITAS Last Seen: unexpected error:', error)
      } finally {
        busy = false
      }
    }

    updateActivity()
    const interval = window.setInterval(updateActivity, 30000)

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(updateActivity, 0)
    })

    return () => {
      stopped = true
      window.clearInterval(interval)
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  return null
}

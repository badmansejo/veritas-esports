import { supabase } from './supabaseClient'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat(
    (4 - (base64String.length % 4)) % 4
  )

  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)

  return Uint8Array.from(
    [...rawData].map((character) =>
      character.charCodeAt(0)
    )
  )
}

export async function registerPushNotifications(userId) {
  try {
    if (!userId) {
      return {
        success: false,
        reason: 'No user ID',
      }
    }

    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return {
        success: false,
        reason: 'Push notifications are not supported',
      }
    }

    let permission = Notification.permission

    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    if (permission !== 'granted') {
      return {
        success: false,
        reason: 'Notification permission not granted',
      }
    }

    const registration =
      await navigator.serviceWorker.register('/sw.js')

    await navigator.serviceWorker.ready

    const configResponse =
      await fetch('/push-config.json', {
        cache: 'no-store',
      })

    if (!configResponse.ok) {
      return {
        success: false,
        reason: 'Push configuration not found',
      }
    }

    const config = await configResponse.json()

    if (!config.vapidPublicKey) {
      return {
        success: false,
        reason: 'VAPID public key missing',
      }
    }

    let subscription =
      await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription =
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(
              config.vapidPublicKey
            ),
        })
    }

    const json = subscription.toJSON()

    if (
      !json.endpoint ||
      !json.keys?.p256dh ||
      !json.keys?.auth
    ) {
      return {
        success: false,
        reason: 'Invalid push subscription',
      }
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
        }
      )

    if (error) {
      console.error(
        'VERITAS push subscription error:',
        error
      )

      return {
        success: false,
        reason: error.message,
      }
    }

    console.log(
      'VERITAS push subscription registered successfully'
    )

    return {
      success: true,
      subscription,
    }
  } catch (error) {
    console.error(
      'VERITAS push registration error:',
      error
    )

    return {
      success: false,
      reason:
        error?.message ||
        'Push registration failed',
    }
  }
}

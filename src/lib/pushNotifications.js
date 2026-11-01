import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from './supabaseClient'

let nativeListeners = []

async function registerNativePushNotifications(userId) {
  for (const listener of nativeListeners) {
    try {
      await listener.remove()
    } catch {}
  }
  nativeListeners = []

  const permission = await PushNotifications.checkPermissions()

  let receivePermission = permission.receive

  if (receivePermission !== 'granted') {
    const requested = await PushNotifications.requestPermissions()
    receivePermission = requested.receive
  }

  if (receivePermission !== 'granted') {
    return {
      success: false,
      reason: 'Push notification permission was not granted',
    }
  }

  nativeListeners.push(
    await PushNotifications.addListener('registration', async ({ value }) => {
      try {
        const { error } = await supabase
          .from('native_push_tokens')
          .upsert(
            {
              user_id: userId,
              token: value,
              platform: Capacitor.getPlatform(),
              is_active: true,
              last_used_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'token' }
          )

        if (error) throw error

        console.log('VERITAS NATIVE PUSH TOKEN REGISTERED')
      } catch (error) {
        console.error('Native push token save failed:', error)
      }
    })
  )

  nativeListeners.push(
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('Native push registration failed:', error)
    })
  )

  nativeListeners.push(
    await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      console.log('VERITAS notification opened:', event.notification)
      window.location.href = '/notifications'
    })
  )

  await PushNotifications.register()

  return { success: true }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)

  return Uint8Array.from(
    [...rawData].map((character) => character.charCodeAt(0))
  )
}

async function registerBrowserPushNotifications(userId) {
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return { success: false, reason: 'Browser push not supported' }
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    return { success: false, reason: `Permission: ${permission}` }
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  })

  await navigator.serviceWorker.ready

  const configResponse = await fetch('/push-config.json', {
    cache: 'no-store',
  })

  if (!configResponse.ok) {
    throw new Error('push-config.json not found')
  }

  const config = await configResponse.json()

  if (!config.vapidPublicKey) {
    throw new Error('VAPID public key missing')
  }

  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
    })
  }

  const json = subscription.toJSON()

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Browser returned an invalid push subscription')
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth_key: json.keys.auth,
        user_agent: navigator.userAgent,
        is_active: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

  if (error) throw error

  console.log('VERITAS BROWSER PUSH REGISTERED')
  return { success: true }
}

export async function registerPushNotifications(userId) {
  try {
    if (!userId) {
      return { success: false, reason: 'No user ID' }
    }

    if (Capacitor.isNativePlatform()) {
      return await registerNativePushNotifications(userId)
    }

    return await registerBrowserPushNotifications(userId)
  } catch (error) {
    console.error('VERITAS PUSH REGISTRATION FAILED:', error)

    return {
      success: false,
      reason: error?.message || 'Push registration failed',
    }
  }
}

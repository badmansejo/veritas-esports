import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import webpush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function getFirebaseAccessToken(serviceAccount: any) {
  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256')
  const now = Math.floor(Date.now() / 1000)

  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(`Firebase OAuth failed: ${JSON.stringify(result)}`)
  }

  return result.access_token as string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST required.' }, 405)
  }

  try {
    const { user_id, title, message, link } = await req.json()

    if (!user_id || typeof user_id !== 'string') {
      return jsonResponse({ error: 'user_id is required.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase server configuration missing.' }, 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const notificationTitle = String(title || 'VERITAS').slice(0, 200)
    const notificationMessage = String(
      message || 'You have a new VERITAS notification.'
    ).slice(0, 2000)
    const notificationLink = String(link || '/notifications').slice(0, 500)

    let webSent = 0
    let webFailed = 0
    let nativeSent = 0
    let nativeFailed = 0
    const errors: string[] = []

    // Browser Web Push
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(
        'mailto:admin@veritas.local',
        vapidPublicKey,
        vapidPrivateKey
      )

      const { data: subscriptions, error } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth_key')
        .eq('user_id', user_id)
        .eq('is_active', true)

      if (error) {
        errors.push(`Browser subscription lookup: ${error.message}`)
      } else {
        for (const item of subscriptions || []) {
          try {
            await webpush.sendNotification(
              {
                endpoint: item.endpoint,
                keys: { p256dh: item.p256dh, auth: item.auth_key },
              },
              JSON.stringify({
                title: notificationTitle,
                body: notificationMessage,
                url: notificationLink,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `veritas-${Date.now()}`,
              })
            )

            webSent++
            await supabaseAdmin
              .from('push_subscriptions')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', item.id)
          } catch (pushError: any) {
            webFailed++
            console.error('Browser push failed:', pushError)

            if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
              await supabaseAdmin
                .from('push_subscriptions')
                .update({
                  is_active: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', item.id)
            }
          }
        }
      }
    }

    // Android native push through Firebase Cloud Messaging
    const firebaseCredentials = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')

    if (firebaseCredentials) {
      try {
        const account = JSON.parse(firebaseCredentials)

        if (!account.project_id || !account.client_email || !account.private_key) {
          throw new Error('Firebase service account JSON is missing required fields.')
        }

        const { data: tokens, error } = await supabaseAdmin
          .from('native_push_tokens')
          .select('id, token')
          .eq('user_id', user_id)
          .eq('is_active', true)

        if (error) throw error

        if (tokens?.length) {
          const accessToken = await getFirebaseAccessToken(account)

          for (const item of tokens) {
            try {
              const response = await fetch(
                `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    message: {
                      token: item.token,
                      notification: {
                        title: notificationTitle,
                        body: notificationMessage,
                      },
                      data: {
                        url: notificationLink,
                        title: notificationTitle,
                        body: notificationMessage,
                      },
                      android: {
                        priority: 'HIGH',
                        notification: {
                          channel_id: 'veritas_notifications',
                          sound: 'default',
                        },
                      },
                    },
                  }),
                }
              )

              if (!response.ok) {
                const errorBody = await response.text()
                nativeFailed++

                console.error('FCM delivery failed:', response.status, errorBody)

                if (
                  response.status === 404 ||
                  errorBody.includes('UNREGISTERED') ||
                  errorBody.includes('INVALID_ARGUMENT')
                ) {
                  await supabaseAdmin
                    .from('native_push_tokens')
                    .update({
                      is_active: false,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', item.id)
                }

                continue
              }

              nativeSent++

              await supabaseAdmin
                .from('native_push_tokens')
                .update({
                  last_used_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', item.id)
            } catch (pushError: any) {
              nativeFailed++
              console.error('Native push failed:', pushError)
            }
          }
        }
      } catch (firebaseError: any) {
        errors.push(`Firebase: ${firebaseError?.message || 'Configuration or sending failed'}`)
        console.error('Firebase notification error:', firebaseError)
      }
    } else {
      errors.push('Firebase service account is not configured; Android push was skipped.')
    }

    return jsonResponse({
      success: webSent + nativeSent > 0,
      sent: webSent,
      failed: webFailed,
      android_sent: nativeSent,
      android_failed: nativeFailed,
      errors,
    })
  } catch (error: any) {
    console.error('Push notification error:', error)
    return jsonResponse({
      error: error?.message || 'Failed to send push notification.',
    }, 500)
  }
})

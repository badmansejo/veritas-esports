import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const body = await req.json()

    const {
      endpoint,
      p256dh,
      auth,
      title,
      message,
      link,
    } = body

    if (
      !endpoint ||
      !p256dh ||
      !auth ||
      !title
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Missing push subscription or notification data.',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      )
    }

    const vapidPublicKey =
      Deno.env.get('VAPID_PUBLIC_KEY')

    const vapidPrivateKey =
      Deno.env.get('VAPID_PRIVATE_KEY')

    if (
      !vapidPublicKey ||
      !vapidPrivateKey
    ) {
      return new Response(
        JSON.stringify({
          error:
            'VAPID keys are not configured.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      )
    }

    webpush.setVapidDetails(
      'mailto:admin@veritas.local',
      vapidPublicKey,
      vapidPrivateKey
    )

    const subscription = {
      endpoint,
      keys: {
        p256dh,
        auth,
      },
    }

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: title,
        body:
          message ||
          'You have a new VERITAS notification.',
        url:
          link ||
          '/notifications',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `veritas-${Date.now()}`,
      })
    )

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    )
  } catch (error) {
    console.error(
      'Push notification error:',
      error
    )

    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          'Failed to send push notification.',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    )
  }
})
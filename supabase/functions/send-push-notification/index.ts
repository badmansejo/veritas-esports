import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import webpush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js@2'

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
      user_id,
      title,
      message,
      link,
    } = body

    if (!user_id) {
      return new Response(
        JSON.stringify({
          error: 'user_id is required.',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const vapidPublicKey =
      Deno.env.get('VAPID_PUBLIC_KEY')

    const vapidPrivateKey =
      Deno.env.get('VAPID_PRIVATE_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          error: 'VAPID keys are not configured.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    webpush.setVapidDetails(
      'mailto:admin@veritas.local',
      vapidPublicKey,
      vapidPrivateKey
    )

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')

    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: 'Supabase server configuration missing.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    const { data: subscriptions, error } =
      await supabaseAdmin
        .from('push_subscriptions')
        .select(
          'id, endpoint, p256dh, auth_key'
        )
        .eq('user_id', user_id)
        .eq('is_active', true)

    if (error) {
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          sent: 0,
          failed: 0,
          message:
            'No active push subscription found for this user.',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    let sent = 0
    let failed = 0

    for (const item of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: item.endpoint,
            keys: {
              p256dh: item.p256dh,
              auth: item.auth_key,
            },
          },
          JSON.stringify({
            title: title || 'VERITAS',
            body:
              message ||
              'You have a new VERITAS notification.',
            url: link || '/notifications',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `veritas-${Date.now()}`,
          })
        )

        sent++

        await supabaseAdmin
          .from('push_subscriptions')
          .update({
            last_used_at:
              new Date().toISOString(),
          })
          .eq('id', item.id)
      } catch (pushError) {
        failed++

        console.error(
          'Push delivery failed:',
          pushError
        )

        const statusCode =
          pushError?.statusCode

        if (
          statusCode === 404 ||
          statusCode === 410
        ) {
          await supabaseAdmin
            .from('push_subscriptions')
            .update({
              is_active: false,
              updated_at:
                new Date().toISOString(),
            })
            .eq('id', item.id)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: sent > 0,
        sent,
        failed,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
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
          'Content-Type': 'application/json',
        },
      }
    )
  }
})

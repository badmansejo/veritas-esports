import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
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

    const userId = body.user_id
    const title = body.title || 'VERITAS'
    const message = body.message || ''

    if (!userId) {
      throw new Error('user_id is required')
    }

    const botToken =
      Deno.env.get('TELEGRAM_BOT_TOKEN')

    if (!botToken) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN is not configured'
      )
    }

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')

    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase server configuration is missing'
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    const { data: connections, error } =
      await supabaseAdmin
        .from('telegram_connections')
        .select('id, telegram_chat_id')
        .eq('user_id', userId)
        .eq('connected', true)
        .not('telegram_chat_id', 'is', null)

    if (error) {
      throw error
    }

    if (!connections?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          sent: 0,
          message:
            'No connected Telegram account found.',
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

    for (const connection of connections) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id:
                connection.telegram_chat_id,
              text:
                `VERITAS\n\n${title}\n\n${message}`,
            }),
          }
        )

        const result = await response.json()

        if (result.ok) {
          sent++
        } else {
          failed++
          console.error(
            'Telegram API error:',
            result
          )
        }
      } catch (error) {
        failed++
        console.error(
          'Telegram delivery error:',
          error
        )
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
      'Telegram notification error:',
      error
    )

    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          'Telegram notification failed',
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

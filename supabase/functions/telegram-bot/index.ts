import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const DEFAULTS = {
  active_bot_number: 6,

  bot_1_username: '@Veritasesports1bot',
  bot_2_username: '@Veritasesports2bot',
  bot_3_username: '@Veritasgamingbot',
  bot_4_username: '@Smartashbot',
  bot_5_username: '@Turrkisshbot',
  bot_6_username: '@Veritasesportsbot',

  welcome_message: '🎮🔥 VERITAS ESPORTS 🔥🎮',
  connection_instructions: '🔗 CONNECT YOUR ACCOUNT',
  connected_message: '🎉✅ CONNECTION SUCCESSFUL! ✅🎉',
  expired_message: '⏰ CODE EXPIRED',
  invalid_code_message: '❌ CONNECTION FAILED',
  help_message: `📌 COMMANDS

/start — 👋 Welcome
/help — ℹ️ Instructions
/connect CODE — 🔗 Connect account
/wallet — 💰 Check wallet balance
/balance — 💰 Check wallet balance
/disconnect — 🔐 Disconnect instructions`,
  disconnect_message: '🔐 TELEGRAM DISCONNECT',
  unknown_command_message: '🎮 VERITAS BOT',
  wallet_status_message: '💰 WALLET STATUS',
  balance_message: '💰 Current Balance: KES {balance}',
  pending_withdrawal_message:
    '⏳ Pending Withdrawal: KES {pending_withdrawal}',
  last_transaction_message:
    '🧾 Last Transaction: {last_transaction}',
}

function replaceValues(message, values) {
  let result = message || ''

  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(
      `{${key}}`,
      String(value ?? '')
    )
  }

  return result
}

function getBotUsername(config, botNumber) {
  return (
    config[`bot_${botNumber}_username`] ||
    DEFAULTS[`bot_${botNumber}_username`]
  )
}

function getBotToken(botNumber) {
  return (
    Deno.env.get(
      `TELEGRAM_BOT_TOKEN_${botNumber}`
    ) || ''
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      )

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase server configuration is missing'
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    const { data: settings } =
      await supabaseAdmin
        .from('telegram_bot_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

    const config = {
      ...DEFAULTS,
      ...(settings || {}),
    }

    const activeBotNumber = Math.min(
      6,
      Math.max(
        1,
        Number(
          config.active_bot_number || 6
        )
      )
    )

    const activeBotUsername =
      getBotUsername(
        config,
        activeBotNumber
      )

    const botToken =
      getBotToken(activeBotNumber)

    if (!botToken) {
      throw new Error(
        `TELEGRAM_BOT_TOKEN_${activeBotNumber} is not configured`
      )
    }

    const body = await req.json()

    const message = body?.message

    if (!message) {
      return new Response('ok')
    }

    const chatId =
      message?.chat?.id

    const text =
      String(
        message?.text || ''
      ).trim()

    if (!chatId) {
      return new Response('ok')
    }

    async function sendTelegram(textToSend) {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: textToSend,
          }),
        }
      )

      const result =
        await response.json()

      if (!result.ok) {
        console.error(
          'Telegram API error:',
          result
        )
      }

      return result
    }

    if (
      text === '/start' ||
      text === '/help'
    ) {
      const response =
        `${config.welcome_message}

━━━━━━━━━━━━━━━━━━

${config.connection_instructions}

━━━━━━━━━━━━━━━━━━

🤖 ${activeBotUsername}

━━━━━━━━━━━━━━━━━━

${config.help_message}`

      await sendTelegram(response)

      return new Response('ok')
    }

    if (
      text === '/wallet' ||
      text === '/balance'
    ) {
      const {
        data: telegramConnection,
        error:
          connectionError,
      } = await supabaseAdmin
        .from('telegram_connections')
        .select('user_id')
        .eq(
          'telegram_chat_id',
          String(chatId)
        )
        .eq('connected', true)
        .maybeSingle()

      if (connectionError) {
        throw connectionError
      }

      if (!telegramConnection) {
        await sendTelegram(
`🔐 ACCOUNT NOT CONNECTED

Connect your VERITAS account first.

Use:

/start`
        )

        return new Response('ok')
      }

      const {
        data: profile,
        error,
      } = await supabaseAdmin
        .from('profiles')
        .select(
          'username, kes_balance'
        )
        .eq(
          'id',
          telegramConnection.user_id
        )
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!profile) {
        await sendTelegram(
`❌ ACCOUNT NOT FOUND

Please open VERITAS and check your account.`
        )

        return new Response('ok')
      }

      const balance =
        Number(
          profile.kes_balance || 0
        ).toLocaleString()

      const pendingWithdrawal = '0'

      const lastTransaction =
        'Check VERITAS Wallet'

      const response =
`${config.wallet_status_message}

━━━━━━━━━━━━━━━━━━

👤 Username: ${profile.username || 'Player'}

${replaceValues(
  config.balance_message,
  { balance }
)}

${replaceValues(
  config.pending_withdrawal_message,
  {
    pending_withdrawal:
      pendingWithdrawal,
  }
)}

${replaceValues(
  config.last_transaction_message,
  {
    last_transaction:
      lastTransaction,
  }
)}

━━━━━━━━━━━━━━━━━━

🎮 VERITAS
🏆 PLAY • COMPETE • WIN`

      await sendTelegram(response)

      return new Response('ok')
    }

    if (
      text.startsWith('/connect ')
    ) {
      const code =
        text
          .substring(9)
          .trim()
          .toUpperCase()

      if (!code) {
        await sendTelegram(
          config.invalid_code_message
        )

        return new Response('ok')
      }

      const {
        data: connection,
        error,
      } = await supabaseAdmin
        .from('telegram_connections')
        .select('*')
        .eq(
          'verification_code',
          code
        )
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!connection) {
        await sendTelegram(
          config.invalid_code_message
        )

        return new Response('ok')
      }

      if (
        connection.connected
      ) {
        await sendTelegram(
          config.connected_message
        )

        return new Response('ok')
      }

      if (
        new Date(
          connection.expires_at
        ).getTime() < Date.now()
      ) {
        await sendTelegram(
          config.expired_message
        )

        return new Response('ok')
      }

      const {
        error: updateError,
      } = await supabaseAdmin
        .from(
          'telegram_connections'
        )
        .update({
          connected: true,
          telegram_chat_id:
            String(chatId),
          connected_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          connection.id
        )

      if (updateError) {
        throw updateError
      }

      await sendTelegram(
`${config.connected_message}

👤 Telegram account connected.

You can now use:

/wallet
/balance
/help`
      )

      return new Response('ok')
    }

    if (
      text === '/disconnect'
    ) {
      await sendTelegram(
`${config.disconnect_message}

To disconnect Telegram:

1. Open VERITAS
2. Go to Settings
3. Open Telegram
4. Select DISCONNECT TELEGRAM`
      )

      return new Response('ok')
    }

    await sendTelegram(
`${config.unknown_command_message}

Use /help to see available commands.`
    )

    return new Response('ok')
  } catch (error) {
    console.error(
      'Telegram bot error:',
      error
    )

    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          'Telegram bot failed',
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

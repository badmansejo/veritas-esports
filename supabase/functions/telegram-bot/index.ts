import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const DEFAULTS = {
  bot_username: '@Veritasesportsbot',

  welcome_message: `🎮🔥 VERITAS ESPORTS 🔥🎮

━━━━━━━━━━━━━━━━━━

👋 WELCOME TO VERITAS!

🏆 Compete
⚔️ Battle
💰 Earn
🎁 Win rewards

This is your official VERITAS notification bot.

📢 You can receive:

🏆 Tournament updates
⚔️ Match notifications
💰 Wallet updates
🪙 V Coins updates
🎁 Rewards
📣 Important announcements
🔐 Security alerts`,

  connection_instructions: `🔗 CONNECT YOUR ACCOUNT

1️⃣ Open the VERITAS web app.

2️⃣ Go to:

⚙️ Settings → Telegram

3️⃣ Tap:

🔵 GENERATE CONNECTION CODE

4️⃣ Copy your 6-character code.

5️⃣ Come back here and send:

/connect YOUR_CODE

💡 Example:

/connect ABC123`,

  connected_message: `🎉✅ CONNECTION SUCCESSFUL! ✅🎉

━━━━━━━━━━━━━━━━━━

🎮 YOUR VERITAS ACCOUNT IS NOW CONNECTED!

You will receive VERITAS notifications here.

🔥 YOU'RE READY TO COMPETE!

🎮 VERITAS
🏆 PLAY • COMPETE • WIN 🏆`,

  expired_message: `⏰ CODE EXPIRED

Your VERITAS connection code has expired.

🔄 Open:

⚙️ VERITAS → Settings → Telegram

and generate a new code.`,

  invalid_code_message: `❌ CONNECTION FAILED

That code is invalid or has already been used.

🔄 Open:

⚙️ VERITAS → Settings → Telegram

and generate a new connection code.`,

  help_message: `📌 COMMANDS

/start — 👋 Welcome
/help — ℹ️ Instructions
/connect CODE — 🔗 Connect account
/wallet — 💰 Check wallet balance
/balance — 💰 Check wallet balance
/disconnect — 🔐 Disconnect instructions`,

  disconnect_message: `🔐 TELEGRAM DISCONNECT

To disconnect Telegram from your VERITAS account:

1️⃣ Open VERITAS

2️⃣ Go to:

⚙️ Settings → Telegram

3️⃣ Tap:

🔴 DISCONNECT TELEGRAM`,

  unknown_command_message: `🎮 VERITAS BOT

❓ I didn't recognize that command.

Try:

/start 👋
/help ℹ️
/wallet 💰
/ balance 💰
/connect CODE 🔗
/disconnect 🔐`,

  wallet_status_message: '💰 WALLET STATUS',

  balance_message:
    '💰 Current Balance: KES {balance}',

  pending_withdrawal_message:
    '⏳ Pending Withdrawal: KES {pending_withdrawal}',

  last_transaction_message:
    '🧾 Last Transaction: {last_transaction}',
}

function replaceValues(
  message: string,
  values: Record<string, string>
) {
  let result = message

  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(
      `{${key}}`,
      value
    )
  }

  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const update = await req.json()
    const incomingMessage = update?.message

    if (!incomingMessage?.chat?.id) {
      return new Response('ok')
    }

    const chatId = String(
      incomingMessage.chat.id
    )

    const text = (
      incomingMessage.text || ''
    ).trim()

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
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      )

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase server configuration is missing'
      )
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey
      )

    const {
      data: settings,
    } = await supabaseAdmin
      .from('telegram_bot_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    const config = {
      ...DEFAULTS,
      ...(settings || {}),
    }

    async function sendTelegram(
      message: string
    ) {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
          }),
        }
      )

      if (!response.ok) {
        console.error(
          'Telegram API:',
          await response.text()
        )
      }
    }

    /*
     * START / HELP
     */
    if (
      text === '/start' ||
      text === '/help'
    ) {
      const message = `${config.welcome_message}

━━━━━━━━━━━━━━━━━━

${config.connection_instructions}

━━━━━━━━━━━━━━━━━━

🤖 ${config.bot_username}

━━━━━━━━━━━━━━━━━━

${config.help_message}`

      await sendTelegram(message)

      return new Response('ok')
    }

    /*
     * CONNECT
     */
    if (
      text
        .toLowerCase()
        .startsWith('/connect')
    ) {
      const code = text
        .replace(/^\/connect\s*/i, '')
        .trim()
        .toUpperCase()

      if (!code) {
        await sendTelegram(
          `${config.invalid_code_message}

💡 Example:

/connect ABC123`
        )

        return new Response('ok')
      }

      const {
        data: connection,
        error,
      } = await supabaseAdmin
        .from('telegram_connections')
        .select(
          'id, user_id, verification_code, expires_at, connected'
        )
        .eq(
          'verification_code',
          code
        )
        .eq('connected', false)
        .maybeSingle()

      if (error) throw error

      if (!connection) {
        await sendTelegram(
          config.invalid_code_message
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
        .from('telegram_connections')
        .update({
          telegram_chat_id: chatId,
          connected: true,
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
        config.connected_message
      )

      return new Response('ok')
    }

    /*
     * WALLET / BALANCE
     */
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
          chatId
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

      const balance = Number(
        profile.kes_balance || 0
      ).toLocaleString()

      const pendingWithdrawal = '0'
      const lastTransaction =
        'Check VERITAS Wallet'

      const message =
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

      await sendTelegram(message)

      return new Response('ok')
    }

    /*
     * DISCONNECT
     */
    if (
      text === '/disconnect'
    ) {
      await sendTelegram(
        config.disconnect_message
      )

      return new Response('ok')
    }

    /*
     * UNKNOWN COMMAND
     */
    await sendTelegram(
      config.unknown_command_message
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
          'Telegram bot error',
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

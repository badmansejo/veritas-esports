import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
}

const RATE_PER_SECOND = 22
const DELAY_MS = 1000 / RATE_PER_SECOND

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const body = await req.json()

    const fromBotNumber =
      Number(body.from_bot_number || 0)

    const toBotNumber =
      Number(body.to_bot_number || 0)

    if (
      toBotNumber < 1 ||
      toBotNumber > 6
    ) {
      throw new Error('Invalid bot number.')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    /*
     * GET SETTINGS
     */
    const {
      data: settings,
      error: settingsError,
    } = await supabase
      .from('telegram_bot_settings')
      .select('*')
      .order('updated_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (settingsError) {
      throw settingsError
    }

    if (!settings) {
      throw new Error(
        'Telegram settings not found.'
      )
    }

    const botUsername =
      (
        settings[
          `bot_${toBotNumber}_username`
        ] || ''
      ).trim()

    if (!botUsername) {
      throw new Error(
        `Bot ${toBotNumber} username is empty.`
      )
    }

    const title =
      settings.bot_switch_notification_title ||
      'VERITAS TELEGRAM BOT UPDATED'

    let message =
      settings.bot_switch_notification_message ||
      'VERITAS has changed the active Telegram bot. Please use the active bot shown in Settings -> Telegram.'

    message = message
      .replaceAll(
        '{bot}',
        botUsername
      )
      .replaceAll(
        '{bot_username}',
        botUsername
      )

    /*
     * CREATE HISTORY
     */
    const {
      data: history,
      error: historyError,
    } = await supabase
      .from(
        'telegram_bot_switch_notifications'
      )
      .insert({
        from_bot_number:
          fromBotNumber > 0
            ? fromBotNumber
            : null,
        to_bot_number:
          toBotNumber,
        sent_count: 0,
        opened_count: 0,
        app_notification_sent_count: 0,
      })
      .select()
      .single()

    if (historyError) {
      throw historyError
    }

    /*
     * GET TELEGRAM-CONNECTED USERS
     * Only these users receive Telegram messages.
     */
    const {
      data: telegramConnections,
      error: connectionError,
    } = await supabase
      .from('telegram_connections')
      .select(
        'user_id, telegram_chat_id'
      )
      .eq(
        'connected',
        true
      )
      .not(
        'telegram_chat_id',
        'is',
        null
      )

    if (connectionError) {
      throw connectionError
    }

    /*
     * GET ALL REGISTERED USERS
     * Every registered user gets the in-app notification.
     */
    const {
      data: allUsers,
      error: usersError,
    } = await supabase
      .from('profiles')
      .select('id')

    if (usersError) {
      throw usersError
    }

    /*
     * TELEGRAM TOKEN
     */
    const token =
      Deno.env.get(
        `TELEGRAM_BOT_TOKEN_${toBotNumber}`
      )

    if (!token) {
      throw new Error(
        `TELEGRAM_BOT_TOKEN_${toBotNumber} is missing.`
      )
    }

    /*
     * SEND TELEGRAM
     */
    let sent = 0
    let failed = 0
    let telegramError: string | null = null

    for (
      let i = 0;
      i < telegramConnections.length;
      i++
    ) {
      const chatId =
        telegramConnections[i]
          .telegram_chat_id

      try {
        const response =
          await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                chat_id: chatId,
                text:
                  `${title}\n\n${message}\n\nActive bot: ${botUsername}`,
              }),
            }
          )

        const result =
          await response.json()

        console.log(
          'Telegram result:',
          JSON.stringify(result)
        )

        if (
          result.ok === true
        ) {
          sent++
        } else {
          failed++

          telegramError =
            result.description ||
            'Telegram rejected message.'

          if (
            response.status === 429
          ) {
            const retryAfter =
              Number(
                result
                  ?.parameters
                  ?.retry_after || 1
              )

            await sleep(
              retryAfter * 1000
            )
          }
        }
      } catch (error) {
        failed++

        telegramError =
          error instanceof Error
            ? error.message
            : 'Telegram request failed.'
      }

      /*
       * 22 TELEGRAM MESSAGES PER SECOND
       */
      if (
        i <
        telegramConnections.length - 1
      ) {
        await sleep(
          DELAY_MS
        )
      }
    }

    /*
     * SAVE TELEGRAM COUNT
     */
    await supabase
      .from(
        'telegram_bot_switch_notifications'
      )
      .update({
        sent_count: sent,
      })
      .eq(
        'id',
        history.id
      )

    /*
     * CREATE IN-APP NOTIFICATION
     * FOR EVERY REGISTERED USER.
     */
    let appNotificationSentCount = 0
    let appNotificationError: string | null = null

    const userIds = [
      ...new Set(
        (allUsers || [])
          .map(
            (user) => user.id
          )
          .filter(Boolean)
      ),
    ]

    if (
      userIds.length > 0
    ) {
      const notificationRows =
        userIds.map(
          (userId) => ({
            user_id: userId,
            category:
              'Announcements',
            type:
              'Telegram',
            title:
              title,
            message:
              `${message}\n\nActive bot: ${botUsername}`,
            is_read: false,
            link:
              '/settings/telegram',
          })
        )

      const {
        data: insertedNotifications,
        error: notificationError,
      } = await supabase
        .from('notifications')
        .insert(
          notificationRows
        )
        .select('id')

      if (notificationError) {
        console.error(
          'App notification error:',
          notificationError
        )

        appNotificationError =
          notificationError.message
      } else {
        appNotificationSentCount =
          insertedNotifications?.length ||
          0
      }
    }

    /*
     * SAVE APP NOTIFICATION COUNT
     */
    await supabase
      .from(
        'telegram_bot_switch_notifications'
      )
      .update({
        app_notification_sent_count:
          appNotificationSentCount,
      })
      .eq(
        'id',
        history.id
      )

    /*
     * RETURN RESULT
     */
    return new Response(
      JSON.stringify({
        success: true,

        active_bot:
          toBotNumber,

        username:
          botUsername,

        registered_users:
          userIds.length,

        telegram_users:
          telegramConnections.length,

        sent_count:
          sent,

        failed_count:
          failed,

        telegram_error:
          telegramError,

        app_notification_sent_count:
          appNotificationSentCount,

        app_notification_error:
          appNotificationError,

        rate_per_second:
          RATE_PER_SECOND,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error(
      'Telegram switch error:',
      error
    )

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Telegram notification failed.',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
        status: 500,
      }
    )
  }
})

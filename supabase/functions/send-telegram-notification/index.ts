import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {
    const body = await req.json()

    const userId = body.user_id
    const title = body.title || "VERITAS"
    const message = body.message || ""

    if (!userId) {
      throw new Error("user_id is required")
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    const { data: settings, error: settingsError } =
      await supabase
        .from("telegram_bot_settings")
        .select("*")
        .order("updated_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()

    if (settingsError) {
      throw settingsError
    }

    const activeBotNumber = Math.min(
      6,
      Math.max(
        1,
        Number(settings?.active_bot_number || 6)
      )
    )

    const token =
      Deno.env.get(
        `TELEGRAM_BOT_TOKEN_${activeBotNumber}`
      ) || ""

    if (!token) {
      throw new Error(
        `TELEGRAM_BOT_TOKEN_${activeBotNumber} is not configured`
      )
    }

    const { data: connections, error: connectionError } =
      await supabase
        .from("telegram_connections")
        .select("telegram_chat_id")
        .eq("user_id", userId)
        .eq("connected", true)
        .not("telegram_chat_id", "is", null)

    if (connectionError) {
      throw connectionError
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          active_bot: activeBotNumber,
          message: "No connected Telegram account",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      )
    }

    const telegramMessage =
      `VERITAS\n\n${title}\n\n${message}`

    let sent = 0

    for (const connection of connections) {
      if (!connection.telegram_chat_id) {
        continue
      }

      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: connection.telegram_chat_id,
            text: telegramMessage,
          }),
        }
      )

      const result = await response.json()

      if (result.ok) {
        sent++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        active_bot: activeBotNumber,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }
})

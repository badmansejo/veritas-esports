import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const { notification_id } = await req.json();

    if (!notification_id) {
      return new Response(
        JSON.stringify({ success: false, error: "notification_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .maybeSingle();

    if (error || !notification) {
      return new Response(
        JSON.stringify({ success: false, error: "Notification not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: settings } = await supabase
      .from("notification_delivery_settings")
      .select("*")
      .eq("user_id", notification.user_id)
      .maybeSingle();

    if (settings?.telegram_enabled === false) {
      return new Response(JSON.stringify({ success: true, skipped: true }));
    }

    const category = String(
      notification.category || notification.type || "Announcements"
    ).toLowerCase();

    if (category.includes("match") && settings?.matches_enabled === false) {
      return new Response(JSON.stringify({ success: true, skipped: true }));
    }

    if (
      category.includes("tournament") &&
      settings?.tournaments_enabled === false
    ) {
      return new Response(JSON.stringify({ success: true, skipped: true }));
    }

    if (category.includes("wallet") && settings?.wallet_enabled === false) {
      return new Response(JSON.stringify({ success: true, skipped: true }));
    }

    if (category.includes("reward") && settings?.rewards_enabled === false) {
      return new Response(JSON.stringify({ success: true, skipped: true }));
    }

    if (
      category.includes("security") &&
      settings?.security_enabled === false
    ) {
      return new Response(JSON.stringify({ success: true, skipped: true }));
    }

    if (
      category.includes("announcement") &&
      settings?.announcements_enabled === false
    ) {
      return new Response(JSON.stringify({ success: true, skipped: true }));
    }

    const { data: connection } = await supabase
      .from("telegram_connections")
      .select("telegram_chat_id, connected")
      .eq("user_id", notification.user_id)
      .eq("connected", true)
      .not("telegram_chat_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!connection?.telegram_chat_id) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "Telegram not connected"
        })
      );
    }

    const { data: botSettings } = await supabase
      .from("telegram_bot_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const activeBotNumber = Math.min(
      6,
      Math.max(1, Number(botSettings?.active_bot_number || 6))
    );

    const token = Deno.env.get(
      `TELEGRAM_BOT_TOKEN_${activeBotNumber}`
    );

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing TELEGRAM_BOT_TOKEN_${activeBotNumber}`
        }),
        { status: 500 }
      );
    }

    const text =
      `VERITAS\n\n${notification.title}\n\n${notification.message}`;

    const telegramUrl =
      `https://api.telegram.org/bot${token}/sendMessage`;

    let response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: connection.telegram_chat_id,
        text
      })
    });

    if (response.status === 429) {
      const retryData = await response.json().catch(() => null);
      const retryAfter =
        Number(retryData?.parameters?.retry_after || 1);

      await sleep(retryAfter * 1000);

      response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: connection.telegram_chat_id,
          text
        })
      });
    }

    const result = await response.json().catch(() => null);

    if (!response.ok || result?.ok !== true) {
      console.error("Telegram error:", result);

      return new Response(
        JSON.stringify({
          success: false,
          telegram_error: result
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        telegram_sent: true
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: String(error)
      }),
      { status: 500 }
    );
  }
});

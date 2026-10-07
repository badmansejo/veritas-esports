import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

const MAX_PER_SECOND = 22;
const DELAY_MS = Math.ceil(1000 / MAX_PER_SECOND);

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async () => {
  try {
    const { data: lockResult, error: lockError } =
      await supabase.rpc("claim_telegram_dispatcher");

    if (lockError) {
      throw lockError;
    }

    if (!lockResult) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "Another dispatcher is running"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    try {
      const { data: queueRows, error: queueError } =
        await supabase.rpc(
          "claim_telegram_notification_batch",
          {
            p_limit: MAX_PER_SECOND
          }
        );

      if (queueError) {
        throw queueError;
      }

      if (!queueRows || queueRows.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            processed: 0,
            sent: 0,
            failed: 0,
            skipped: 0
          }),
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (let i = 0; i < queueRows.length; i++) {
        const row = queueRows[i];

        try {
          const { data: notification, error: notificationError } =
            await supabase
              .from("notifications")
              .select("*")
              .eq("id", row.notification_id)
              .maybeSingle();

          if (notificationError) {
            throw notificationError;
          }

          if (!notification) {
            await supabase.rpc(
              "finish_telegram_notification",
              {
                p_queue_id: row.queue_id,
                p_success: false,
                p_error_message: "Notification not found"
              }
            );

            failed++;
            continue;
          }

          const { data: settings } = await supabase
            .from("notification_delivery_settings")
            .select("*")
            .eq("user_id", notification.user_id)
            .maybeSingle();

          if (settings?.telegram_enabled === false) {
            await supabase.rpc(
              "finish_telegram_notification",
              {
                p_queue_id: row.queue_id,
                p_success: false,
                p_error_message: "Telegram disabled"
              }
            );

            skipped++;
            continue;
          }

          const category = String(
            notification.category ||
            notification.type ||
            "Announcements"
          ).toLowerCase();

          const categoryDisabled =
            (category.includes("match") &&
              settings?.matches_enabled === false) ||
            (category.includes("tournament") &&
              settings?.tournaments_enabled === false) ||
            (category.includes("wallet") &&
              settings?.wallet_enabled === false) ||
            (category.includes("reward") &&
              settings?.rewards_enabled === false) ||
            (category.includes("security") &&
              settings?.security_enabled === false) ||
            (category.includes("announcement") &&
              settings?.announcements_enabled === false);

          if (categoryDisabled) {
            await supabase.rpc(
              "finish_telegram_notification",
              {
                p_queue_id: row.queue_id,
                p_success: false,
                p_error_message: "Notification category disabled"
              }
            );

            skipped++;
            continue;
          }

          const { data: connection } = await supabase
            .from("telegram_connections")
            .select("telegram_chat_id")
            .eq("user_id", notification.user_id)
            .eq("connected", true)
            .not("telegram_chat_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!connection?.telegram_chat_id) {
            await supabase.rpc(
              "finish_telegram_notification",
              {
                p_queue_id: row.queue_id,
                p_success: false,
                p_error_message: "Telegram not connected"
              }
            );

            skipped++;
            continue;
          }

          const { data: botSettings } = await supabase
            .from("telegram_bot_settings")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const activeBotNumber = Math.min(
            6,
            Math.max(
              1,
              Number(botSettings?.active_bot_number || 6)
            )
          );

          const token = Deno.env.get(
            `TELEGRAM_BOT_TOKEN_${activeBotNumber}`
          );

          if (!token) {
            await supabase.rpc(
              "finish_telegram_notification",
              {
                p_queue_id: row.queue_id,
                p_success: false,
                p_error_message:
                  `Missing TELEGRAM_BOT_TOKEN_${activeBotNumber}`
              }
            );

            failed++;
            continue;
          }

          const telegramUrl =
            `https://api.telegram.org/bot${token}/sendMessage`;

          const text =
            `VERITAS\n\n` +
            `${notification.title}\n\n` +
            `${notification.message}`;

          let response = await fetch(
            telegramUrl,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                chat_id: connection.telegram_chat_id,
                text
              })
            }
          );

          if (response.status === 429) {
            const retryData =
              await response.json().catch(() => null);

            const retryAfter = Math.max(
              1,
              Number(
                retryData?.parameters?.retry_after || 1
              )
            );

            await sleep(retryAfter * 1000);

            response = await fetch(
              telegramUrl,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  chat_id: connection.telegram_chat_id,
                  text
                })
              }
            );
          }

          const result =
            await response.json().catch(() => null);

          if (!response.ok || result?.ok !== true) {
            await supabase.rpc(
              "finish_telegram_notification",
              {
                p_queue_id: row.queue_id,
                p_success: false,
                p_error_message: JSON.stringify(result)
              }
            );

            failed++;
          } else {
            await supabase.rpc(
              "finish_telegram_notification",
              {
                p_queue_id: row.queue_id,
                p_success: true,
                p_error_message: null
              }
            );

            sent++;
          }

        } catch (error) {
          await supabase.rpc(
            "finish_telegram_notification",
            {
              p_queue_id: row.queue_id,
              p_success: false,
              p_error_message: String(error)
            }
          );

          failed++;
        }

        if (i < queueRows.length - 1) {
          await sleep(DELAY_MS);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: queueRows.length,
          sent,
          failed,
          skipped,
          maximum_rate: "22 Telegram messages per second"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

    } finally {
      await supabase.rpc("release_telegram_dispatcher");
    }

  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: String(error)
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cleanupSecret = Deno.env.get("RESULT_EVIDENCE_CLEANUP_SECRET");

const supabase = createClient(supabaseUrl, serviceRoleKey);

function getObjectPath(value: string, bucket: string): string {
  let path = value;

  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    const marker = `/${bucket}/`;
    const position = url.pathname.indexOf(marker);

    if (position < 0) {
      throw new Error("Evidence URL does not identify the expected bucket");
    }

    path = url.pathname.slice(position + marker.length);
  } else if (path.startsWith(`${bucket}/`)) {
    path = path.slice(bucket.length + 1);
  }

  path = decodeURIComponent(path.split("?")[0]).replace(/^\/+/, "");

  if (!path || path.includes("..")) {
    throw new Error("Invalid evidence object path");
  }

  return path;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (
    !cleanupSecret ||
    request.headers.get("x-cleanup-secret") !== cleanupSecret
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { data: rows, error } = await supabase
      .from("result_evidence_cleanup_queue")
      .select("id, match_result_id, bucket_id, object_path")
      .is("processed_at", null)
      .not("match_result_id", "is", null)
      .limit(50);

    if (error) throw error;

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows ?? []) {
      try {
        const { data: result, error: resultError } = await supabase
          .from("match_results")
          .select("id, match_id, evidence_url")
          .eq("id", row.match_result_id)
          .maybeSingle();

        if (resultError) throw resultError;

        if (!result?.match_id) {
          skipped++;
          continue;
        }

        const { data: match, error: matchError } = await supabase
          .from("matches")
          .select("tournament_id")
          .eq("id", result.match_id)
          .maybeSingle();

        if (matchError) throw matchError;

        if (!match?.tournament_id) {
          skipped++;
          continue;
        }

        const { data: tournament, error: tournamentError } =
          await supabase
            .from("tournaments")
            .select("status")
            .eq("id", match.tournament_id)
            .maybeSingle();

        if (tournamentError) throw tournamentError;

        if (tournament?.status !== "Completed") {
          skipped++;
          continue;
        }

        const bucket = String(row.bucket_id || "");
        if (!bucket || !row.object_path) {
          throw new Error("Missing bucket or object path");
        }

        const objectPath = getObjectPath(row.object_path, bucket);

        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([objectPath]);

        if (deleteError) throw deleteError;

        const { error: updateResultError } = await supabase
          .from("match_results")
          .update({ evidence_url: null })
          .eq("id", result.id)
          .eq("evidence_url", result.evidence_url);

        if (updateResultError) throw updateResultError;

        const { error: finishError } = await supabase
          .from("result_evidence_cleanup_queue")
          .update({
            processed_at: new Date().toISOString(),
            error_message: null
          })
          .eq("id", row.id)
          .is("processed_at", null);

        if (finishError) throw finishError;

        processed++;
      } catch (error) {
        failed++;

        await supabase
          .from("result_evidence_cleanup_queue")
          .update({ error_message: String(error).slice(0, 1000) })
          .eq("id", row.id)
          .is("processed_at", null);
      }
    }

    return Response.json({
      success: true,
      checked: rows?.length ?? 0,
      processed,
      skipped,
      failed
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
});

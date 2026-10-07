CREATE OR REPLACE FUNCTION public.claim_telegram_notification_batch(
    p_limit integer DEFAULT 22
)
RETURNS TABLE (
    queue_id uuid,
    notification_id uuid,
    user_id uuid,
    title text,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    WITH claimed AS (
        SELECT q.id
        FROM public.telegram_notification_queue q
        WHERE q.status = 'pending'
           OR (
                q.status = 'processing'
                AND q.claimed_at < now() - interval '10 minutes'
              )
        ORDER BY q.created_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    ),
    updated AS (
        UPDATE public.telegram_notification_queue q
        SET
            status = 'processing',
            claimed_at = now(),
            attempts = q.attempts + 1
        FROM claimed c
        WHERE q.id = c.id
        RETURNING
            q.id,
            q.notification_id,
            q.user_id
    )
    SELECT
        u.id AS queue_id,
        u.notification_id,
        u.user_id,
        n.title,
        n.message
    FROM updated u
    INNER JOIN public.notifications n
        ON n.id = u.notification_id
    ORDER BY u.id;
END;
$function$;


GRANT EXECUTE ON FUNCTION public.claim_telegram_notification_batch(integer)
TO service_role;

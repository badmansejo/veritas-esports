CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS trigger_veritas_notification_telegram
ON public.notifications;

DROP FUNCTION IF EXISTS public.veritas_send_notification_to_telegram();

CREATE TABLE IF NOT EXISTS public.telegram_notification_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    claimed_at timestamptz,
    sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS telegram_notification_queue_status_idx
ON public.telegram_notification_queue(status, created_at);

CREATE INDEX IF NOT EXISTS telegram_notification_queue_user_id_idx
ON public.telegram_notification_queue(user_id);

CREATE TABLE IF NOT EXISTS public.telegram_dispatcher_lock (
    id integer PRIMARY KEY DEFAULT 1,
    locked_until timestamptz
);

INSERT INTO public.telegram_dispatcher_lock(id, locked_until)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_telegram_dispatcher()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_claimed boolean;
BEGIN
    UPDATE public.telegram_dispatcher_lock
    SET locked_until = now() + interval '10 seconds'
    WHERE id = 1
      AND (locked_until IS NULL OR locked_until < now())
    RETURNING true INTO v_claimed;

    RETURN COALESCE(v_claimed, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_telegram_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    UPDATE public.telegram_dispatcher_lock
    SET locked_until = NULL
    WHERE id = 1;
END;
$function$;

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
        ORDER BY q.created_at
        FOR UPDATE SKIP LOCKED
        LIMIT LEAST(GREATEST(p_limit, 1), 22)
    )
    UPDATE public.telegram_notification_queue q
    SET
        status = 'processing',
        attempts = q.attempts + 1,
        claimed_at = now(),
        error_message = NULL
    FROM claimed c
    JOIN public.notifications n
      ON n.id = q.notification_id
    WHERE q.id = c.id
    RETURNING
        q.id,
        q.notification_id,
        q.user_id,
        n.title,
        n.message;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finish_telegram_notification(
    p_queue_id uuid,
    p_success boolean,
    p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    UPDATE public.telegram_notification_queue
    SET
        status = CASE
            WHEN p_success THEN 'sent'
            WHEN attempts >= 5 THEN 'failed'
            ELSE 'pending'
        END,
        error_message = p_error_message,
        sent_at = CASE
            WHEN p_success THEN now()
            ELSE sent_at
        END,
        claimed_at = CASE
            WHEN p_success THEN claimed_at
            ELSE NULL
        END
    WHERE id = p_queue_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.veritas_queue_notification_for_telegram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.telegram_notification_queue (
        notification_id,
        user_id
    )
    VALUES (
        NEW.id,
        NEW.user_id
    );

    PERFORM net.http_post(
        url := 'https://cwddzzrapjilxrccnqiw.supabase.co/functions/v1/process-telegram-notification-queue',
        headers := jsonb_build_object(
            'Content-Type',
            'application/json'
        ),
        body := jsonb_build_object(
            'triggered_by',
            'notification',
            'notification_id',
            NEW.id
        )
    );

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_veritas_notification_telegram_queue
ON public.notifications;

CREATE TRIGGER trigger_veritas_notification_telegram_queue
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.veritas_queue_notification_for_telegram();

CREATE OR REPLACE FUNCTION public.recover_stuck_telegram_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.telegram_notification_queue
    SET
        status = 'pending',
        claimed_at = NULL
    WHERE status = 'processing'
      AND claimed_at < now() - interval '2 minutes';

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN v_count;
END;
$function$;

ALTER TABLE public.telegram_notification_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.telegram_notification_queue FROM anon;
REVOKE ALL ON public.telegram_notification_queue FROM authenticated;

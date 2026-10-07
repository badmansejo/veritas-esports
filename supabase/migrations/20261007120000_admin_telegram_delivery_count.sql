CREATE OR REPLACE FUNCTION public.admin_get_telegram_delivery_count(
    p_notification_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    result_count integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    SELECT COUNT(*)
    INTO result_count
    FROM public.telegram_notification_queue q
    WHERE q.notification_id = ANY(p_notification_ids)
      AND q.status = 'sent';

    RETURN COALESCE(result_count, 0);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_telegram_delivery_count(uuid[])
TO authenticated;

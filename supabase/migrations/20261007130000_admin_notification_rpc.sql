CREATE OR REPLACE FUNCTION public.admin_create_notification(
    p_user_id uuid,
    p_title text,
    p_message text,
    p_category text DEFAULT 'Announcements',
    p_link text DEFAULT '/notifications'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    new_id uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        category,
        type,
        is_read,
        link
    )
    VALUES (
        p_user_id,
        p_title,
        p_message,
        p_category,
        p_category,
        false,
        p_link
    )
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_create_notification(
    uuid,
    text,
    text,
    text,
    text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_deposit_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_username text;
    v_amount text;
    v_method text;
    v_reference text;
BEGIN
    IF lower(coalesce(NEW.status, '')) <> 'pending' THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(username, ''), 'Player')
    INTO v_username
    FROM public.profiles
    WHERE id = NEW.user_id;

    v_username := COALESCE(v_username, 'Player');
    v_amount := to_char(NEW.amount, 'FM999999999990.00');
    v_method := COALESCE(NULLIF(NEW.method, ''), 'Deposit');
    v_reference := COALESCE(NULLIF(NEW.reference, ''), 'Not provided');

    -- Notify the player who submitted the deposit.
    INSERT INTO public.notifications (
        user_id, title, message, category, type, is_read, link
    )
    VALUES (
        NEW.user_id,
        'Deposit submitted',
        'Your deposit request of KES ' || v_amount ||
        ' via ' || v_method ||
        ' has been submitted successfully. Reference: ' ||
        v_reference || '. Status: Pending verification.',
        'Wallet',
        'Wallet',
        false,
        '/notifications'
    );

    -- Notify every admin through the existing notification and Telegram queue.
    INSERT INTO public.notifications (
        user_id, title, message, category, type, is_read, link
    )
    SELECT
        p.id,
        'New deposit request',
        v_username || ' submitted a deposit of KES ' || v_amount ||
        ' via ' || v_method ||
        '. Reference: ' || v_reference ||
        '. Please review it in Admin Deposits.',
        'Wallet',
        'Wallet',
        false,
        '/admin/deposits'
    FROM public.profiles AS p
    WHERE p.is_admin IS TRUE;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_notify_deposit_submission
ON public.deposits;

CREATE TRIGGER trigger_notify_deposit_submission
AFTER INSERT ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_deposit_submission();

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.veritas_send_notification_to_telegram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret
  INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'telegram_notification_secret'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://cwddzzrapjilxrccnqiw.supabase.co/functions/v1/send-telegram-notification',
    headers := jsonb_build_object(
      'Content-Type',
      'application/json'
    ),
    body := jsonb_build_object(
      'secret',
      v_secret,
      'notification_id',
      NEW.id
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_veritas_notification_telegram
ON public.notifications;

CREATE TRIGGER trigger_veritas_notification_telegram
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.veritas_send_notification_to_telegram();

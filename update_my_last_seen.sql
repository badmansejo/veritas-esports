CREATE OR REPLACE FUNCTION public.update_my_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.profiles
  SET last_seen_at = pg_catalog.now()
  WHERE id = auth.uid();
END;
$function$;

REVOKE ALL ON FUNCTION public.update_my_last_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_last_seen() TO authenticated;

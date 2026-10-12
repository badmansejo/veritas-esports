-- VERITAS Referral System: safe migration
-- Preserves existing tables and data.

CREATE OR REPLACE FUNCTION public.generate_veritas_referral_code(p_username text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_base text;
  v_code text;
  v_suffix text;
  v_attempt integer := 0;
BEGIN
  v_base := upper(regexp_replace(coalesce(p_username, 'PLAYER'), '[^a-zA-Z0-9]', '', 'g'));
  v_base := left(v_base, 12);

  IF v_base = '' THEN
    v_base := 'PLAYER';
  END IF;

  LOOP
    v_suffix := upper(substr(md5(gen_random_uuid()::text), 1, 5));
    v_code := 'VER-' || v_base || v_suffix;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.referral_codes WHERE code = v_code
    );

    v_attempt := v_attempt + 1;
    IF v_attempt > 20 THEN
      RAISE EXCEPTION 'Could not generate a unique referral code';
    END IF;
  END LOOP;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_veritas_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_username text;
BEGIN
  SELECT code
    INTO v_code
  FROM public.referral_codes
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  SELECT username
    INTO v_username
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  v_code := public.generate_veritas_referral_code(v_username);

  INSERT INTO public.referral_codes (user_id, code, is_active, total_referrals, successful_referrals)
  VALUES (p_user_id, v_code, true, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT code
    INTO v_code
  FROM public.referral_codes
  WHERE user_id = p_user_id;

  RETURN v_code;
END;
$$;

-- Create referral codes for profiles that do not already have one.
DO $$
DECLARE
  v_user record;
BEGIN
  FOR v_user IN
    SELECT p.id, p.username
    FROM public.profiles p
    LEFT JOIN public.referral_codes rc ON rc.user_id = p.id
    WHERE rc.user_id IS NULL
  LOOP
    INSERT INTO public.referral_codes
      (user_id, code, is_active, total_referrals, successful_referrals)
    VALUES (
      v_user.id,
      public.generate_veritas_referral_code(v_user.username),
      true,
      0,
      0
    )
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Ensure newly created profiles receive a referral code.
CREATE OR REPLACE FUNCTION public.handle_veritas_profile_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_veritas_referral_code(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_create_referral_code ON public.profiles;

CREATE TRIGGER profiles_create_referral_code
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_veritas_profile_referral_code();

-- Record a referral after the referred user's profile exists.
CREATE OR REPLACE FUNCTION public.record_veritas_referral(
  p_referred_user_id uuid,
  p_referral_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code public.referral_codes%ROWTYPE;
  v_existing_id uuid;
BEGIN
  IF p_referred_user_id IS NULL OR p_referral_code IS NULL OR btrim(p_referral_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'missing_input');
  END IF;

  SELECT *
    INTO v_code
  FROM public.referral_codes
  WHERE upper(code) = upper(btrim(p_referral_code))
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_code');
  END IF;

  IF v_code.user_id = p_referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'self_referral');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_referred_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
  END IF;

  SELECT id
    INTO v_existing_id
  FROM public.referrals
  WHERE referred_user_id = p_referred_user_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_recorded');
  END IF;

  INSERT INTO public.referrals (
    referrer_id,
    referred_user_id,
    referral_code_id,
    status,
    qualification_amount,
    reward_granted
  )
  VALUES (
    v_code.user_id,
    p_referred_user_id,
    v_code.id,
    'Pending',
    0,
    false
  )
  ON CONFLICT (referred_user_id) DO NOTHING;

  UPDATE public.referral_codes
  SET total_referrals = (
    SELECT COUNT(*)
    FROM public.referrals
    WHERE referral_code_id = v_code.id
  )
  WHERE id = v_code.id;

  RETURN jsonb_build_object('success', true, 'reason', 'recorded');
END;
$$;

-- Restrict referral recording to authenticated users acting for themselves.
REVOKE ALL ON FUNCTION public.record_veritas_referral(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_veritas_referral(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_veritas_referral_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_veritas_referral_code(uuid) TO authenticated;

-- Generate a referral code for the current signed-in user.
CREATE OR REPLACE FUNCTION public.my_veritas_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN public.ensure_veritas_referral_code(auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.my_veritas_referral_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_veritas_referral_code() TO authenticated;

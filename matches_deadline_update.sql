CREATE OR REPLACE FUNCTION public.submit_match_result(
  p_match_id uuid,
  p_my_score integer,
  p_opponent_score integer,
  p_evidence_url text DEFAULT NULL
)
RETURNS public.match_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_result public.match_results%ROWTYPE;
  v_p1_score integer;
  v_p2_score integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in first';
  END IF;

  IF p_my_score IS NULL OR p_opponent_score IS NULL
     OR p_my_score < 0 OR p_opponent_score < 0 THEN
    RAISE EXCEPTION 'Enter valid scores';
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF auth.uid() NOT IN (v_match.player_one_id, v_match.player_two_id)
     OR v_match.player_one_id IS NULL
     OR v_match.player_two_id IS NULL THEN
    RAISE EXCEPTION 'You are not a player in this match';
  END IF;

  IF lower(v_match.status) IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'This match is already closed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.match_results
    WHERE match_id = p_match_id
      AND lower(result_status) IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'A result is already pending or confirmed';
  END IF;

  IF auth.uid() = v_match.player_one_id THEN
    v_p1_score := p_my_score;
    v_p2_score := p_opponent_score;
  ELSE
    v_p1_score := p_opponent_score;
    v_p2_score := p_my_score;
  END IF;

  UPDATE public.match_results
  SET player_one_score = v_p1_score,
      player_two_score = v_p2_score,
      result_status = 'Pending',
      submitted_by = auth.uid(),
      submitted_at = now(),
      evidence_url = p_evidence_url,
      dispute_reason = NULL,
      disputed_at = NULL,
      confirmed_at = NULL,
      confirmed_by = NULL
  WHERE match_id = p_match_id
    AND lower(result_status) IN ('disputed', 'rejected')
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    INSERT INTO public.match_results (
      match_id, submitted_by, player_one_score, player_two_score,
      result_status, submitted_at, evidence_url
    )
    VALUES (
      p_match_id, auth.uid(), v_p1_score, v_p2_score,
      'Pending', now(), p_evidence_url
    )
    RETURNING * INTO v_result;
  END IF;

  UPDATE public.matches
  SET player_one_score = v_p1_score,
      player_two_score = v_p2_score,
      status = 'Awaiting Confirmation',
      result_submitted_at = now(),
      confirmation_deadline = now() + interval '2 hours',
      dispute_deadline = now() + interval '2 hours',
      updated_at = now()
  WHERE id = p_match_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_match_result(uuid, integer, integer, text)
TO authenticated;

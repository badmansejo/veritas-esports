CREATE OR REPLACE FUNCTION public.notify_match_completed_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament text;
  v_player_one text;
  v_player_two text;
  v_winner text;
  v_details text;
  v_user uuid;
BEGIN
  IF NEW.status <> 'Completed'
     OR OLD.status = 'Completed' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_tournament
  FROM public.tournaments
  WHERE id = NEW.tournament_id;

  SELECT COALESCE(username, 'Player')
  INTO v_player_one
  FROM public.profiles
  WHERE id = NEW.player_one_id;

  SELECT COALESCE(username, 'Player')
  INTO v_player_two
  FROM public.profiles
  WHERE id = NEW.player_two_id;

  SELECT COALESCE(username, 'Unknown')
  INTO v_winner
  FROM public.profiles
  WHERE id = NEW.winner_id;

  v_details :=
    'Tournament: ' || COALESCE(v_tournament, 'Unknown') || E'\n' ||
    'Match: Round ' || COALESCE(NEW.round_number, 1)::text ||
    ' · Match ' || COALESCE(NEW.match_number, 1)::text || E'\n\n' ||
    v_player_one || ': ' ||
    COALESCE(NEW.player_one_score::text, '—') || E'\n' ||
    v_player_two || ': ' ||
    COALESCE(NEW.player_two_score::text, '—') || E'\n\n' ||
    'Winner: ' || COALESCE(v_winner, 'Unknown') || E'\n' ||
    'Status: Completed';

  FOREACH v_user IN ARRAY ARRAY[NEW.player_one_id, NEW.player_two_id]
  LOOP
    IF v_user IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id, title, message, category, type, is_read
      )
      VALUES (
        v_user,
        '⚽ Match Completed',
        v_details,
        'Match',
        'Match',
        false
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_match_completed_details
ON public.matches;

CREATE TRIGGER trigger_match_completed_details
AFTER UPDATE OF status ON public.matches
FOR EACH ROW
WHEN (NEW.status = 'Completed')
EXECUTE FUNCTION public.notify_match_completed_details();

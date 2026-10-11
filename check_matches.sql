select 'tournaments' as source, count(*) as total
from public.tournaments
union all
select 'matches' as source, count(*) as total
from public.matches
union all
select 'participants' as source, count(*) as total
from public.tournament_participants;

select
  t.name as tournament,
  t.status as tournament_status,
  m.match_number,
  m.status as match_status,
  m.player_one_id,
  m.player_two_id
from public.tournaments t
left join public.matches m on m.tournament_id = t.id
order by t.created_at desc, m.match_number;

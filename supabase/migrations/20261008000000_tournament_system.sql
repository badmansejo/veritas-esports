-- VERITAS TOURNAMENT SYSTEM
-- Football only
-- Public/private rooms
-- 7-day expiry
-- Creator-controlled START
-- No player entry fee

create extension if not exists pgcrypto;

drop function if exists public.create_tournament(text,text,integer,text,text,timestamptz,text);
drop function if exists public.join_tournament(text,text);
drop function if exists public.start_tournament(uuid);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),

  creator_id uuid not null references public.profiles(id) on delete cascade,

  tournament_code text unique not null,
  private_room_code text unique,

  name text not null,
  game text not null default 'Football',

  room_type text not null default 'Public'
    check (room_type in ('Public','Private')),

  max_players integer not null
    check (max_players >= 2 and max_players <= 128),

  format text not null
    check (format in ('Knockout','League','Group + Knockout')),

  rules text,

  start_date date,
  start_time time,

  creator_whatsapp text not null,

  status text not null default 'Open'
    check (status in ('Open','Ongoing','Completed')),

  creator_started boolean not null default false,

  private_room_link text,

  expires_at timestamptz not null default (now() + interval '7 days'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournaments
  add column if not exists room_type text;

alter table public.tournaments
  add column if not exists private_room_code text;

alter table public.tournaments
  add column if not exists private_room_link text;

alter table public.tournaments
  add column if not exists creator_whatsapp text;

alter table public.tournaments
  add column if not exists start_date date;

alter table public.tournaments
  add column if not exists start_time time;

alter table public.tournaments
  add column if not exists creator_started boolean default false;

alter table public.tournaments
  add column if not exists expires_at timestamptz;

alter table public.tournaments
  add column if not exists updated_at timestamptz default now();

update public.tournaments
set room_type = 'Public'
where room_type is null;

update public.tournaments
set creator_started = false
where creator_started is null;

update public.tournaments
set expires_at = created_at + interval '7 days'
where expires_at is null;

alter table public.tournaments
  alter column room_type set default 'Public';

alter table public.tournaments
  alter column room_type set not null;

alter table public.tournaments
  alter column creator_started set default false;

alter table public.tournaments
  alter column creator_started set not null;

alter table public.tournaments
  alter column expires_at set default (now() + interval '7 days');

alter table public.tournaments
  alter column expires_at set not null;

create index if not exists tournaments_status_idx
on public.tournaments(status);

create index if not exists tournaments_creator_idx
on public.tournaments(creator_id);

create index if not exists tournaments_expires_idx
on public.tournaments(expires_at);

create index if not exists tournaments_private_code_idx
on public.tournaments(private_room_code);

create table if not exists public.tournament_participants (
  id uuid primary key default gen_random_uuid(),

  tournament_id uuid not null
    references public.tournaments(id) on delete cascade,

  user_id uuid not null
    references public.profiles(id) on delete cascade,

  whatsapp_number text not null,

  status text not null default 'Joined'
    check (status in ('Joined','Withdrawn','Disqualified')),

  joined_at timestamptz not null default now(),

  unique(tournament_id,user_id)
);

create index if not exists tournament_participants_tournament_idx
on public.tournament_participants(tournament_id);

create index if not exists tournament_participants_user_idx
on public.tournament_participants(user_id);

create table if not exists public.tournament_standings (
  id uuid primary key default gen_random_uuid(),

  tournament_id uuid not null
    references public.tournaments(id) on delete cascade,

  user_id uuid not null
    references public.profiles(id) on delete cascade,

  position integer default 0,

  played integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,

  goals_for integer not null default 0,
  goals_against integer not null default 0,
  goal_difference integer not null default 0,

  points integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(tournament_id,user_id)
);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),

  tournament_id uuid not null
    references public.tournaments(id) on delete cascade,

  round_number integer,
  match_number integer,

  player_one_id uuid references public.profiles(id) on delete set null,
  player_two_id uuid references public.profiles(id) on delete set null,

  player_one_score integer,
  player_two_score integer,

  winner_id uuid references public.profiles(id) on delete set null,

  status text not null default 'Pending'
    check (status in (
      'Pending',
      'Awaiting Confirmation',
      'Confirmed',
      'Disputed',
      'Completed'
    )),

  submitted_by uuid references public.profiles(id) on delete set null,

  screenshot_url text,

  dispute_deadline timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tournament_matches_tournament_idx
on public.tournament_matches(tournament_id);

create table if not exists public.tournament_issues (
  id uuid primary key default gen_random_uuid(),

  tournament_id uuid not null
    references public.tournaments(id) on delete cascade,

  user_id uuid not null
    references public.profiles(id) on delete cascade,

  issue_type text not null,

  message text not null,

  status text not null default 'Open'
    check (status in ('Open','Resolved','Closed')),

  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists tournament_issues_tournament_idx
on public.tournament_issues(tournament_id);

create or replace function public.generate_tournament_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  loop
    new_code := 'VRT-' || upper(substr(md5(random()::text),1,5));

    exit when not exists (
      select 1
      from public.tournaments
      where tournament_code = new_code
    );
  end loop;

  return new_code;
end;
$$;

create or replace function public.generate_private_room_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  loop
    new_code := 'VRT-' || upper(substr(md5(random()::text),1,5));

    exit when not exists (
      select 1
      from public.tournaments
      where private_room_code = new_code
    );
  end loop;

  return new_code;
end;
$$;

create or replace function public.create_tournament(
  p_name text,
  p_room_type text,
  p_max_players integer,
  p_format text,
  p_rules text,
  p_start_date date,
  p_start_time time,
  p_creator_whatsapp text
)
returns public.tournaments
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tournament public.tournaments;
  code_value text;
  private_code_value text;
begin

  if auth.uid() is null then
    raise exception 'You must be logged in.';
  end if;

  if trim(coalesce(p_name,'')) = '' then
    raise exception 'Tournament name is required.';
  end if;

  if p_room_type not in ('Public','Private') then
    raise exception 'Invalid room type.';
  end if;

  if p_max_players < 2 or p_max_players > 128 then
    raise exception 'Maximum players must be between 2 and 128.';
  end if;

  if p_format not in ('Knockout','League','Group + Knockout') then
    raise exception 'Invalid tournament format.';
  end if;

  if trim(coalesce(p_creator_whatsapp,'')) = '' then
    raise exception 'Creator WhatsApp number is required.';
  end if;

  if p_rules is not null
     and array_length(regexp_split_to_array(trim(p_rules), '\s+'),1) > 200 then
    raise exception 'Rules cannot exceed 200 words.';
  end if;

  code_value := public.generate_tournament_code();

  if p_room_type = 'Private' then
    private_code_value := public.generate_private_room_code();
  end if;

  insert into public.tournaments (
    creator_id,
    tournament_code,
    private_room_code,
    name,
    game,
    room_type,
    max_players,
    format,
    rules,
    start_date,
    start_time,
    creator_whatsapp,
    status,
    creator_started,
    private_room_link,
    expires_at
  )
  values (
    auth.uid(),
    code_value,
    private_code_value,
    trim(p_name),
    'Football',
    p_room_type,
    p_max_players,
    p_format,
    nullif(trim(p_rules),''),
    p_start_date,
    p_start_time,
    trim(p_creator_whatsapp),
    'Open',
    false,
    case
      when p_room_type = 'Private'
      then '/tournaments/' || code_value
      else null
    end,
    now() + interval '7 days'
  )
  returning * into new_tournament;

  insert into public.tournament_participants (
    tournament_id,
    user_id,
    whatsapp_number
  )
  values (
    new_tournament.id,
    auth.uid(),
    trim(p_creator_whatsapp)
  );

  return new_tournament;
end;
$$;

create or replace function public.join_tournament(
  p_tournament_code text,
  p_whatsapp text
)
returns public.tournament_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_row public.tournaments;
  participant_count integer;
  result_row public.tournament_participants;
begin

  if auth.uid() is null then
    raise exception 'You must be logged in.';
  end if;

  select *
  into tournament_row
  from public.tournaments
  where tournament_code = upper(trim(p_tournament_code))
     or private_room_code = upper(trim(p_tournament_code));

  if not found then
    raise exception 'Tournament not found.';
  end if;

  if tournament_row.expires_at <= now() then
    raise exception 'This tournament has expired.';
  end if;

  if tournament_row.status <> 'Open' then
    raise exception 'This tournament is no longer open for joining.';
  end if;

  if trim(coalesce(p_whatsapp,'')) = '' then
    raise exception 'WhatsApp number is required.';
  end if;

  if tournament_row.room_type = 'Private'
     and upper(trim(p_tournament_code)) <> upper(coalesce(tournament_row.private_room_code,'')) then
    raise exception 'Private room code required.';
  end if;

  select count(*)
  into participant_count
  from public.tournament_participants
  where tournament_id = tournament_row.id
    and status = 'Joined';

  if participant_count >= tournament_row.max_players then
    raise exception 'Tournament is full.';
  end if;

  if exists (
    select 1
    from public.tournament_participants
    where tournament_id = tournament_row.id
      and user_id = auth.uid()
      and status = 'Joined'
  ) then
    raise exception 'You have already joined this tournament.';
  end if;

  insert into public.tournament_participants (
    tournament_id,
    user_id,
    whatsapp_number
  )
  values (
    tournament_row.id,
    auth.uid(),
    trim(p_whatsapp)
  )
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.start_tournament(
  p_tournament_id uuid
)
returns public.tournaments
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_row public.tournaments;
begin

  if auth.uid() is null then
    raise exception 'You must be logged in.';
  end if;

  select *
  into tournament_row
  from public.tournaments
  where id = p_tournament_id
    and creator_id = auth.uid();

  if not found then
    raise exception 'Tournament not found or you are not the creator.';
  end if;

  if tournament_row.expires_at <= now() then
    raise exception 'This tournament has expired.';
  end if;

  if tournament_row.status <> 'Open' then
    raise exception 'Tournament has already started.';
  end if;

  update public.tournaments
  set
    status = 'Ongoing',
    creator_started = true,
    updated_at = now()
  where id = p_tournament_id
  returning * into tournament_row;

  return tournament_row;
end;
$$;

create or replace function public.tournaments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tournaments_updated_at_trigger
on public.tournaments;

create trigger tournaments_updated_at_trigger
before update on public.tournaments
for each row
execute function public.tournaments_updated_at();

alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_standings enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.tournament_issues enable row level security;

drop policy if exists "tournaments_select_authenticated"
on public.tournaments;

create policy "tournaments_select_authenticated"
on public.tournaments
for select
to authenticated
using (
  expires_at > now()
  or creator_id = auth.uid()
);

drop policy if exists "participants_select_authenticated"
on public.tournament_participants;

create policy "participants_select_authenticated"
on public.tournament_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_id
      and (t.expires_at > now() or t.creator_id = auth.uid())
  )
);

drop policy if exists "standings_select_authenticated"
on public.tournament_standings;

create policy "standings_select_authenticated"
on public.tournament_standings
for select
to authenticated
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_id
      and (t.expires_at > now() or t.creator_id = auth.uid())
  )
);

drop policy if exists "matches_select_authenticated"
on public.tournament_matches;

create policy "matches_select_authenticated"
on public.tournament_matches
for select
to authenticated
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_id
      and (t.expires_at > now() or t.creator_id = auth.uid())
  )
);

drop policy if exists "issues_select_authenticated"
on public.tournament_issues;

create policy "issues_select_authenticated"
on public.tournament_issues
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.tournaments t
    where t.id = tournament_id
      and t.creator_id = auth.uid()
  )
);

grant execute on function public.create_tournament(
  text,text,integer,text,text,date,time,text
) to authenticated;

grant execute on function public.join_tournament(
  text,text
) to authenticated;

grant execute on function public.start_tournament(
  uuid
) to authenticated;

grant select on public.tournaments to authenticated;
grant select on public.tournament_participants to authenticated;
grant select on public.tournament_standings to authenticated;
grant select on public.tournament_matches to authenticated;
grant select on public.tournament_issues to authenticated;
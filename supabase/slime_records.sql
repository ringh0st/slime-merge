-- Slime Merge records: anyone can save a score under a name and see the best of this week, this month and all time,
-- in the whole world or inside a private club (a code friends share), plus one board per daily jar.
-- No accounts. Run in Supabase → SQL Editor (the Lumipals project). Safe to run more than once; run it again after
-- every change to this file.

create table if not exists public.slime_scores (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);
-- The club the score was saved in, the daily jar it was played in, and how the player's slime looks on the board.
alter table public.slime_scores add column if not exists club text;
alter table public.slime_scores add column if not exists daily date;
alter table public.slime_scores add column if not exists top smallint;
alter table public.slime_scores add column if not exists hat text;
create index if not exists slime_scores_created_at on public.slime_scores (created_at);
create index if not exists slime_scores_score on public.slime_scores (score desc);
create index if not exists slime_scores_club on public.slime_scores (club) where club is not null;
create index if not exists slime_scores_daily on public.slime_scores (daily) where daily is not null;

-- Nobody reads or writes the table directly: only through the functions below.
alter table public.slime_scores enable row level security;
revoke all on public.slime_scores from anon, authenticated;

-- Names the owner hid from every board (a rude name the word list missed).
-- To hide a name, run:    insert into public.slime_hidden_names (name) values ('the name');
-- To show it again:       delete from public.slime_hidden_names where name = 'the name';
create table if not exists public.slime_hidden_names (
  name text primary key,
  created_at timestamptz not null default now()
);
alter table public.slime_hidden_names enable row level security;
revoke all on public.slime_hidden_names from anon, authenticated;
-- The report button was removed; these clear away what an earlier version of this file made.
drop function if exists public.slime_report_name(text);
drop table if exists public.slime_reports;

-- Whether the owner hid this name.
create or replace function public._slime_hidden(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.slime_hidden_names h where lower(h.name) = lower(p_name));
$$;

-- Earlier versions of the functions (their arguments or results changed).
drop function if exists public.slime_save_score(text, integer);
drop function if exists public.slime_records(text);
drop function if exists public.slime_records(text, text);
drop function if exists public.slime_daily(date, text);

-- A club code looks like JELLY-4821. Must match CLUB_CODE in src/club.js.
create or replace function public._slime_club(p_club text)
returns text
language sql
immutable
as $$
  select case when upper(btrim(coalesce(p_club, ''))) ~ '^[A-Z]{3,8}-[0-9]{2,4}$' then upper(btrim(p_club)) end;
$$;

-- Save one score. The name rules must match nameProblem() in src/records.js, the hats HAT_IDS in src/game/goals.js.
create or replace function public.slime_save_score(
  p_name text, p_score integer, p_club text default null, p_daily date default null, p_top integer default null, p_hat text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_plain text;
  v_club text := public._slime_club(p_club);
  v_today date := (now() at time zone 'utc')::date;
  -- A daily jar is the UTC day's; a day either side is allowed for clocks and late saves.
  v_daily date := case when p_daily between v_today - 1 and v_today + 1 then p_daily end;
  v_top smallint := case when p_top between 0 and 9 then p_top end;
  v_hat text := case when p_hat in ('top', 'bow', 'party', 'cool', 'flower', 'crown', 'beanie', 'halo') then p_hat end;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 16 then
    raise exception using message = 'Names are 2 to 16 characters.';
  end if;
  if v_name !~ '^[[:alpha:][:digit:] ]+$' then
    raise exception using message = 'Letters, numbers and spaces only.';
  end if;
  v_plain := translate(regexp_replace(lower(v_name), '[[:space:]_.-]', '', 'g'), '0134573@$', 'oieasteas');
  if exists (select 1 from unnest(array['fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'cock', 'penis', 'vagina', 'boob', 'porn', 'sex', 'slut', 'whore', 'nigg', 'fag', 'nazi', 'hitler', 'rape', 'kill', 'piss', 'bastard', 'admin', 'moderator']) as part where position(part in v_plain) > 0) then
    raise exception using message = 'Let’s pick a friendlier name.';
  end if;
  if p_score is null or p_score < 1 or p_score > 1000000 then
    raise exception using message = 'That score can’t be saved.';
  end if;
  -- A double tap on Save, or a flood of saves, changes nothing.
  if exists (select 1 from public.slime_scores where name = v_name and score = p_score and created_at > now() - interval '1 minute')
     or (select count(*) from public.slime_scores where created_at > now() - interval '1 minute') >= 60 then
    return jsonb_build_object('saved', false, 'name', v_name);
  end if;
  insert into public.slime_scores (name, score, club, daily, top, hat) values (v_name, p_score, v_club, v_daily, v_top, v_hat);
  return jsonb_build_object('saved', true, 'name', v_name);
end;
$$;

-- The top 20 for 'week' (from Monday, UTC), 'month' (from the 1st, UTC) or 'all': each name's best score,
-- in the whole world or, with a club code, among the scores saved in that club.
create or replace function public.slime_records(p_period text, p_club text default null)
returns table (place integer, name text, score integer, top smallint, hat text)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select distinct on (lower(s.name)) s.name, s.score, s.created_at, s.top, s.hat
    from public.slime_scores s
    where s.created_at >= case p_period
      when 'week' then date_trunc('week', now() at time zone 'utc') at time zone 'utc'
      when 'month' then date_trunc('month', now() at time zone 'utc') at time zone 'utc'
      else '-infinity'::timestamptz
    end
      and (p_club is null or s.club = public._slime_club(p_club))
      and not public._slime_hidden(s.name)
    order by lower(s.name), s.score desc, s.created_at
  )
  select (row_number() over (order by best.score desc, best.created_at))::integer, best.name, best.score, best.top, best.hat
  from best
  order by best.score desc, best.created_at
  limit 20;
$$;

-- The top 20 of one daily jar: each name's best score that day, in the world or in a club.
create or replace function public.slime_daily(p_day date, p_club text default null)
returns table (place integer, name text, score integer, top smallint, hat text)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select distinct on (lower(s.name)) s.name, s.score, s.created_at, s.top, s.hat
    from public.slime_scores s
    where s.daily = p_day and (p_club is null or s.club = public._slime_club(p_club))
      and not public._slime_hidden(s.name)
    order by lower(s.name), s.score desc, s.created_at
  )
  select (row_number() over (order by best.score desc, best.created_at))::integer, best.name, best.score, best.top, best.hat
  from best
  order by best.score desc, best.created_at
  limit 20;
$$;

-- Last week's winner of a club (Monday to Monday, UTC): the name with the best score saved in it, if any.
create or replace function public.slime_club_winner(p_club text)
returns table (name text, score integer)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, s.score
  from public.slime_scores s
  where s.club = public._slime_club(p_club)
    and s.created_at >= (date_trunc('week', now() at time zone 'utc') - interval '7 days') at time zone 'utc'
    and s.created_at < date_trunc('week', now() at time zone 'utc') at time zone 'utc'
    and not public._slime_hidden(s.name)
  order by s.score desc, s.created_at
  limit 1;
$$;

revoke all on function public._slime_club(text) from public;
revoke all on function public._slime_hidden(text) from public;
revoke all on function public.slime_club_winner(text) from public;
grant execute on function public.slime_club_winner(text) to anon, authenticated;
revoke all on function public.slime_save_score(text, integer, text, date, integer, text) from public;
revoke all on function public.slime_records(text, text) from public;
revoke all on function public.slime_daily(date, text) from public;
grant execute on function public.slime_save_score(text, integer, text, date, integer, text) to anon, authenticated;
grant execute on function public.slime_records(text, text) to anon, authenticated;
grant execute on function public.slime_daily(date, text) to anon, authenticated;

-- Slime Merge records: anyone can save a score under a name, and see the best of this week, this month and all time.
-- No accounts. Run once in Supabase → SQL Editor (the Lumipals project). Safe to run more than once.

create table if not exists public.slime_scores (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);
create index if not exists slime_scores_created_at on public.slime_scores (created_at);
create index if not exists slime_scores_score on public.slime_scores (score desc);

-- Nobody reads or writes the table directly: only through the two functions below.
alter table public.slime_scores enable row level security;
revoke all on public.slime_scores from anon, authenticated;

-- Save one score. The name rules must match nameProblem() in src/records.js.
create or replace function public.slime_save_score(p_name text, p_score integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_plain text;
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
  insert into public.slime_scores (name, score) values (v_name, p_score);
  return jsonb_build_object('saved', true, 'name', v_name);
end;
$$;

-- The top 20 for 'week' (from Monday, UTC), 'month' (from the 1st, UTC) or 'all': each name's best score.
create or replace function public.slime_records(p_period text)
returns table (place integer, name text, score integer)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select distinct on (lower(s.name)) s.name, s.score, s.created_at
    from public.slime_scores s
    where s.created_at >= case p_period
      when 'week' then date_trunc('week', now() at time zone 'utc') at time zone 'utc'
      when 'month' then date_trunc('month', now() at time zone 'utc') at time zone 'utc'
      else '-infinity'::timestamptz
    end
    order by lower(s.name), s.score desc, s.created_at
  )
  select (row_number() over (order by best.score desc, best.created_at))::integer, best.name, best.score
  from best
  order by best.score desc, best.created_at
  limit 20;
$$;

revoke all on function public.slime_save_score(text, integer) from public;
revoke all on function public.slime_records(text) from public;
grant execute on function public.slime_save_score(text, integer) to anon, authenticated;
grant execute on function public.slime_records(text) to anon, authenticated;

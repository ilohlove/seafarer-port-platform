-- CrewPort Reputation / XP V1
-- Ledger entries are append-only. All writes go through security-definer RPCs.

create table if not exists public.xp_rule_definitions (
  event_type text primary key,
  amount integer not null,
  rewarded_limit integer,
  window_hours integer,
  display_order integer not null,
  enabled boolean not null default true,
  constraint xp_rule_amount check (amount >= 0),
  constraint xp_rule_limit check (rewarded_limit is null or rewarded_limit > 0),
  constraint xp_rule_window check (window_hours is null or window_hours > 0)
);

insert into public.xp_rule_definitions
  (event_type, amount, rewarded_limit, window_hours, display_order)
values
  ('approved_note', 100, null, null, 10),
  ('community_confirmed', 50, null, null, 20),
  ('accepted_correction', 30, null, null, 30),
  ('verified_confirmation', 10, 3, 24, 40),
  ('highly_useful', 50, null, null, 50)
on conflict (event_type) do update set
  amount = excluded.amount,
  rewarded_limit = excluded.rewarded_limit,
  window_hours = excluded.window_hours,
  display_order = excluded.display_order;

create table if not exists public.xp_system_config (
  singleton boolean primary key default true check (singleton),
  launch_at timestamptz,
  launched_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.xp_system_config (singleton) values (true)
on conflict (singleton) do nothing;

create table if not exists public.xp_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_xp integer not null default 0 check (current_xp >= 0),
  updated_at timestamptz not null default now()
);

insert into public.xp_accounts (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create table if not exists public.xp_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  source_type text not null,
  source_id text not null,
  requested_amount integer not null,
  amount integer not null,
  dedupe_key text not null unique,
  actor_id uuid references auth.users(id) on delete set null,
  reason_code text,
  reason_text text,
  reversal_of uuid references public.xp_ledger_entries(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint xp_ledger_requested_nonzero check (requested_amount <> 0),
  constraint xp_reversal_unique unique (reversal_of)
);

create index if not exists xp_ledger_user_time
  on public.xp_ledger_entries (user_id, created_at desc, id desc);
create index if not exists xp_ledger_source
  on public.xp_ledger_entries (source_type, source_id);
create index if not exists xp_ledger_event_time
  on public.xp_ledger_entries (event_type, created_at desc);

alter table public.port_notes
  add column if not exists content_origin text not null default 'user'
    check (content_origin in ('user', 'seed', 'import', 'admin')),
  add column if not exists confirmation_epoch integer not null default 1
    check (confirmation_epoch > 0),
  add column if not exists current_revision_id uuid,
  add column if not exists highly_useful boolean not null default false,
  add column if not exists last_verified_at timestamptz;

alter table public.moderation_events add column if not exists idempotency_key uuid;
create unique index if not exists moderation_events_actor_idempotency
  on public.moderation_events (actor_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.note_corrections (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.port_notes(id) on delete cascade,
  submitter_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('UPDATE', 'ADD', 'INVALIDATE')),
  field_type text not null check (field_type in (
    'price', 'location', 'hours', 'contact', 'service', 'operatingStatus', 'other'
  )),
  current_information text not null check (char_length(current_information) between 1 and 4000),
  proposed_information text not null check (char_length(proposed_information) between 1 and 4000),
  verification_period text not null check (verification_period in (
    'today', 'last7Days', 'last30Days', 'oneToThreeMonths', 'older'
  )),
  note text check (note is null or char_length(note) <= 1000),
  evidence_path text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  impact text check (impact is null or impact in ('minor', 'material')),
  decision_reason text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submitter_id, idempotency_key)
);

create index if not exists note_corrections_queue
  on public.note_corrections (status, created_at);
create index if not exists note_corrections_note
  on public.note_corrections (note_id, created_at desc);

create table if not exists public.note_revisions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.port_notes(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  summary text not null check (char_length(summary) between 1 and 4000),
  details jsonb not null default '{}'::jsonb,
  contact text,
  correction_id uuid references public.note_corrections(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  impact text not null default 'minor' check (impact in ('minor', 'material')),
  created_at timestamptz not null default now(),
  unique (note_id, revision_number)
);

do $$ begin
  alter table public.port_notes add constraint port_notes_current_revision_fk
    foreign key (current_revision_id) references public.note_revisions(id) on delete set null;
exception when duplicate_object then null;
end $$;

insert into public.note_revisions
  (note_id, revision_number, summary, details, contact, created_by, impact, created_at)
select n.id, 1, n.summary, n.details, n.contact, n.author_id, 'minor', n.created_at
from public.port_notes n
where not exists (select 1 from public.note_revisions r where r.note_id = n.id)
on conflict (note_id, revision_number) do nothing;

update public.port_notes n
set current_revision_id = r.id
from public.note_revisions r
where r.note_id = n.id and r.revision_number = 1 and n.current_revision_id is null;

alter table public.note_accuracy_assessments
  add column if not exists confirmation_source text
    check (confirmation_source is null or confirmation_source in ('direct', 'companion', 'reference')),
  add column if not exists verification_period text
    check (verification_period is null or verification_period in (
      'today', 'last7Days', 'last30Days', 'oneToThreeMonths', 'older'
    )),
  add column if not exists verified_at timestamptz,
  add column if not exists comment text,
  add column if not exists evidence_path text,
  add column if not exists idempotency_key uuid,
  add column if not exists rewarded_at timestamptz;

create unique index if not exists note_accuracy_user_idempotency
  on public.note_accuracy_assessments (user_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.note_quality_awards (
  note_id uuid primary key references public.port_notes(id) on delete cascade,
  awarded_to uuid not null references auth.users(id) on delete cascade,
  reason_code text not null check (reason_code in (
    'detailed', 'missingData', 'practicalValue', 'actionable', 'other'
  )),
  active boolean not null default true,
  awarded_by uuid not null references auth.users(id) on delete restrict,
  awarded_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoke_reason text
);

create table if not exists public.note_helpful_votes (
  note_id uuid not null references public.port_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  earned_at timestamptz not null,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, achievement_key)
);

create or replace function public.xp_rank_json(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with score as (
    select coalesce((select current_xp from public.xp_accounts where user_id = p_user_id), 0) as xp
  ), ranked as (
    select xp, case
      when xp >= 50000 then 9 when xp >= 25000 then 8 when xp >= 12000 then 7
      when xp >= 6000 then 6 when xp >= 3000 then 5 when xp >= 1500 then 4
      when xp >= 700 then 3 when xp >= 300 then 2 when xp >= 100 then 1 else 0
    end as level from score
  )
  select jsonb_build_object('level', level, 'xp', xp) from ranked;
$$;

create or replace function public.xp_system_is_live()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select launch_at <= now() from public.xp_system_config where singleton), false) $$;

create or replace function public.apply_xp_event(
  p_user_id uuid,
  p_event_type text,
  p_source_type text,
  p_source_id text,
  p_requested_amount integer,
  p_dedupe_key text,
  p_actor_id uuid default null,
  p_reason_code text default null,
  p_reason_text text default null,
  p_reversal_of uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.xp_ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.xp_ledger_entries;
  v_balance integer;
  v_amount integer;
  v_entry public.xp_ledger_entries;
begin
  if p_user_id is null or p_requested_amount = 0 or char_length(p_dedupe_key) < 3 then
    raise exception 'invalid_xp_event' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_dedupe_key, 0));
  select * into v_existing from public.xp_ledger_entries where dedupe_key = p_dedupe_key;
  if v_existing.id is not null then return v_existing; end if;
  insert into public.xp_accounts (user_id) values (p_user_id)
    on conflict (user_id) do nothing;
  select current_xp into v_balance from public.xp_accounts where user_id = p_user_id for update;
  v_amount := case when p_requested_amount < 0
    then -least(v_balance, abs(p_requested_amount)) else p_requested_amount end;
  if v_amount <> 0 then
    update public.xp_accounts set current_xp = current_xp + v_amount, updated_at = now()
      where user_id = p_user_id;
  end if;
  insert into public.xp_ledger_entries (
    user_id, event_type, source_type, source_id, requested_amount, amount,
    dedupe_key, actor_id, reason_code, reason_text, reversal_of, metadata
  ) values (
    p_user_id, p_event_type, p_source_type, p_source_id, p_requested_amount, v_amount,
    p_dedupe_key, p_actor_id, p_reason_code, nullif(trim(p_reason_text), ''),
    p_reversal_of, coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_entry;
  return v_entry;
end;
$$;

create or replace function public.create_initial_note_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_revision_id uuid;
begin
  insert into public.note_revisions (note_id, revision_number, summary, details, contact, created_by, impact)
  values (new.id, 1, new.summary, new.details, new.contact, new.author_id, 'minor')
  returning id into v_revision_id;
  update public.port_notes set current_revision_id = v_revision_id where id = new.id;
  return new;
end;
$$;

drop trigger if exists port_note_initial_revision on public.port_notes;
create trigger port_note_initial_revision
  after insert on public.port_notes
  for each row execute procedure public.create_initial_note_revision();

create or replace function public.xp_rule_amount(p_event_type text)
returns integer
language sql stable security definer set search_path = public
as $$ select amount from public.xp_rule_definitions where event_type = p_event_type and enabled $$;

create or replace function public.get_my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare v_user auth.users; v_profile public.profiles;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select * into v_profile from public.profiles where user_id = v_user.id;
  return jsonb_build_object(
    'user_id', v_user.id, 'email', coalesce(v_user.email, ''),
    'full_name', coalesce(v_profile.full_name, ''), 'nickname', v_profile.nickname,
    'avatar_url', v_user.raw_user_meta_data ->> 'avatar_url',
    'role', public.current_app_role(), 'rank', public.xp_rank_json(v_user.id),
    'achievements', coalesce((select jsonb_agg(jsonb_build_object(
      'key', a.achievement_key, 'earned_at', a.earned_at
    )) from public.user_achievements a where a.user_id = v_user.id and a.revoked_at is null), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_my_xp_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'rank', public.xp_rank_json(auth.uid()),
    'recent', coalesce((select jsonb_agg(row_to_json(e)) from (
      select id, event_type, source_type, source_id, amount, reason_code,
        reason_text, metadata, created_at
      from public.xp_ledger_entries where user_id = auth.uid()
      order by created_at desc, id desc limit 7
    ) e), '[]'::jsonb),
    'rules', coalesce((select jsonb_agg(jsonb_build_object(
      'event_type', event_type, 'amount', amount, 'rewarded_limit', rewarded_limit,
      'window_hours', window_hours
    ) order by display_order) from public.xp_rule_definitions where enabled), '[]'::jsonb)
  );
$$;

create or replace function public.list_my_xp_events(
  p_filter text default 'all', p_cursor text default null, p_limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_time timestamptz; v_id uuid; v_items jsonb; v_limit integer := greatest(1, least(p_limit, 50)); v_last jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_filter not in ('all', 'earned', 'adjusted') then raise exception 'invalid_filter' using errcode = '22023'; end if;
  if p_cursor is not null then
    v_time := split_part(p_cursor, '|', 1)::timestamptz;
    v_id := split_part(p_cursor, '|', 2)::uuid;
  end if;
  select coalesce(jsonb_agg(row_to_json(e)), '[]'::jsonb) into v_items from (
    select id, event_type, source_type, source_id, amount, reason_code, reason_text, metadata, created_at
    from public.xp_ledger_entries
    where user_id = auth.uid()
      and (p_filter = 'all' or (p_filter = 'earned' and amount > 0) or (p_filter = 'adjusted' and amount < 0))
      and (v_time is null or (created_at, id) < (v_time, v_id))
    order by created_at desc, id desc limit v_limit + 1
  ) e;
  if jsonb_array_length(v_items) > v_limit then
    v_last := v_items -> (v_limit - 1);
    return jsonb_build_object('items', v_items - v_limit,
      'next_cursor', concat(v_last ->> 'created_at', '|', v_last ->> 'id'));
  end if;
  return jsonb_build_object('items', v_items, 'next_cursor', null);
end;
$$;

create or replace function public.get_my_xp_event(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(e) - 'user_id' - 'dedupe_key' - 'actor_id' - 'reversal_of' - 'requested_amount'
  from public.xp_ledger_entries e where e.id = p_event_id and e.user_id = auth.uid();
$$;

create or replace function public.submit_verified_confirmation(
  p_note_id uuid,
  p_source text,
  p_verification_period text,
  p_comment text,
  p_idempotency_key uuid,
  p_evidence_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.port_notes; v_verified_at timestamptz; v_eligible boolean;
  v_reward integer := 0; v_count integer; v_rule public.xp_rule_definitions;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_source not in ('direct', 'companion', 'reference') then raise exception 'invalid_confirmation_source' using errcode = '22023'; end if;
  if p_verification_period not in ('today', 'last7Days', 'last30Days', 'oneToThreeMonths', 'older') then
    raise exception 'invalid_verification_period' using errcode = '22023';
  end if;
  if p_evidence_path is not null and split_part(p_evidence_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_evidence_path' using errcode = '42501';
  end if;
  select * into v_note from public.port_notes where id = p_note_id
    and visibility = 'public' and moderation_state = 'approved' for update;
  if v_note.id is null then raise exception 'note_not_available' using errcode = 'P0002'; end if;
  if v_note.author_id = auth.uid() then raise exception 'self_assessment_not_allowed' using errcode = '42501'; end if;
  v_verified_at := case p_verification_period
    when 'today' then now() when 'last7Days' then now() - interval '3 days'
    when 'last30Days' then now() - interval '15 days'
    when 'oneToThreeMonths' then now() - interval '2 months'
    else now() - interval '4 months' end;
  v_eligible := p_source = 'direct' and p_verification_period <> 'older';
  insert into public.note_accuracy_assessments (
    note_id, user_id, answer, assessment_revision, confirmation_source,
    verification_period, verified_at, comment, evidence_path, idempotency_key
  ) values (
    p_note_id, auth.uid(), 'stillCorrect', v_note.confirmation_epoch, p_source,
    p_verification_period, v_verified_at, nullif(left(trim(p_comment), 1000), ''),
    nullif(trim(p_evidence_path), ''), p_idempotency_key
  ) on conflict (note_id, user_id, assessment_revision) do update set
    answer = excluded.answer, confirmation_source = excluded.confirmation_source,
    verification_period = excluded.verification_period, verified_at = excluded.verified_at,
    comment = excluded.comment, evidence_path = excluded.evidence_path, updated_at = now();

  if public.xp_system_is_live() and v_eligible and not exists (
    select 1 from public.xp_ledger_entries where dedupe_key = concat('confirmation:', auth.uid(), ':', p_note_id)
  ) then
    select * into v_rule from public.xp_rule_definitions where event_type = 'verified_confirmation' and enabled;
    select count(*) into v_count from public.xp_ledger_entries
      where user_id = auth.uid() and event_type = 'verified_confirmation'
        and created_at > now() - make_interval(hours => v_rule.window_hours);
    if v_count < v_rule.rewarded_limit then
      perform public.apply_xp_event(auth.uid(), 'verified_confirmation', 'note', p_note_id::text,
        v_rule.amount, concat('confirmation:', auth.uid(), ':', p_note_id), null, null, null, null,
        jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160)));
      v_reward := v_rule.amount;
      update public.note_accuracy_assessments set rewarded_at = now()
        where note_id = p_note_id and user_id = auth.uid() and assessment_revision = v_note.confirmation_epoch;
    end if;
  end if;

  if v_eligible then update public.port_notes set last_verified_at = greatest(last_verified_at, v_verified_at) where id = p_note_id; end if;
  select count(*) into v_count from public.note_accuracy_assessments a
    where a.note_id = p_note_id and a.assessment_revision = v_note.confirmation_epoch
      and a.answer = 'stillCorrect' and a.confirmation_source = 'direct'
      and a.verified_at >= now() - interval '3 months';
  if public.xp_system_is_live() and v_count >= 3 and v_note.author_id is not null then
    perform public.apply_xp_event(v_note.author_id, 'community_confirmed', 'note', p_note_id::text,
      public.xp_rule_amount('community_confirmed'), concat('community-confirmed:', p_note_id), null, null, null, null,
      jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160)));
  end if;
  return jsonb_build_object('rewarded_xp', v_reward, 'community_confirmation_count', v_count);
end;
$$;

create or replace function public.toggle_note_helpful(p_note_id uuid, p_helpful boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if not exists (select 1 from public.port_notes where id = p_note_id and visibility = 'public' and moderation_state = 'approved') then
    raise exception 'note_not_available' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.port_notes where id = p_note_id and author_id = auth.uid()) then
    raise exception 'self_helpful_not_allowed' using errcode = '42501';
  end if;
  if p_helpful then insert into public.note_helpful_votes (note_id, user_id) values (p_note_id, auth.uid()) on conflict do nothing;
  else delete from public.note_helpful_votes where note_id = p_note_id and user_id = auth.uid(); end if;
  return (select count(*) from public.note_helpful_votes where note_id = p_note_id);
end;
$$;

create or replace function public.submit_note_correction(
  p_note_id uuid, p_action text, p_field_type text, p_current_information text,
  p_proposed_information text, p_verification_period text, p_note text,
  p_evidence_path text, p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_correction public.note_corrections;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_evidence_path is not null and split_part(p_evidence_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_evidence_path' using errcode = '42501';
  end if;
  if not exists (select 1 from public.port_notes where id = p_note_id and visibility = 'public' and moderation_state = 'approved') then
    raise exception 'note_not_available' using errcode = 'P0002';
  end if;
  insert into public.note_corrections (
    note_id, submitter_id, action, field_type, current_information, proposed_information,
    verification_period, note, evidence_path, idempotency_key
  ) values (
    p_note_id, auth.uid(), p_action, p_field_type, trim(p_current_information),
    trim(p_proposed_information), p_verification_period, nullif(trim(p_note), ''),
    nullif(trim(p_evidence_path), ''), p_idempotency_key
  ) on conflict (submitter_id, idempotency_key) do update set updated_at = public.note_corrections.updated_at
  returning * into v_correction;
  return to_jsonb(v_correction) - 'submitter_id';
end;
$$;

create or replace function public.list_correction_queue(p_status text default 'pending')
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when public.current_app_role() in ('admin', 'moderator') then
    coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'note_id', c.note_id, 'action', c.action, 'field_type', c.field_type,
      'current_information', c.current_information, 'proposed_information', c.proposed_information,
      'verification_period', c.verification_period, 'note', c.note, 'evidence_path', c.evidence_path,
      'status', c.status, 'impact', c.impact, 'created_at', c.created_at,
      'note_summary', n.summary, 'port_key', n.port_key,
      'submitter_alias', coalesce(p.nickname, '')
    ) order by c.created_at), '[]'::jsonb) else '[]'::jsonb end
  from public.note_corrections c join public.port_notes n on n.id = c.note_id
  left join public.profiles p on p.user_id = c.submitter_id
  where c.status = p_status;
$$;

create or replace function public.review_note_correction(
  p_correction_id uuid, p_decision text, p_impact text, p_reason text, p_idempotency_key uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_c public.note_corrections; v_n public.port_notes; v_revision public.note_revisions; v_number integer;
begin
  if public.current_app_role() not in ('admin', 'moderator') then raise exception 'staff_required' using errcode = '42501'; end if;
  if p_decision not in ('accepted', 'rejected') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  if p_decision = 'accepted' and p_impact not in ('minor', 'material') then raise exception 'impact_required' using errcode = '22023'; end if;
  select * into v_c from public.note_corrections where id = p_correction_id and status = 'pending' for update;
  if v_c.id is null then raise exception 'correction_not_pending' using errcode = 'P0002'; end if;
  select * into v_n from public.port_notes where id = v_c.note_id for update;
  if auth.uid() in (v_c.submitter_id, v_n.author_id) then raise exception 'self_review_not_allowed' using errcode = '42501'; end if;
  update public.note_corrections set status = p_decision, impact = case when p_decision = 'accepted' then p_impact else null end,
    decision_reason = nullif(trim(p_reason), ''), decided_by = auth.uid(), decided_at = now(), updated_at = now()
    where id = v_c.id;
  if p_decision = 'rejected' then return; end if;
  select coalesce(max(revision_number), 0) + 1 into v_number from public.note_revisions where note_id = v_n.id;
  insert into public.note_revisions (
    note_id, revision_number, summary, details, contact, correction_id, created_by, approved_by, impact
  ) values (
    v_n.id, v_number, v_c.proposed_information, v_n.details, v_n.contact,
    v_c.id, v_c.submitter_id, auth.uid(), p_impact
  ) returning * into v_revision;
  update public.port_notes set summary = v_c.proposed_information, current_revision_id = v_revision.id,
    confirmation_epoch = confirmation_epoch + case when p_impact = 'material' then 1 else 0 end,
    moderation_state = case when v_c.action = 'INVALIDATE' then 'quarantined' else moderation_state end,
    updated_at = now() where id = v_n.id;
  if public.xp_system_is_live() and v_c.submitter_id <> v_n.author_id then
    perform public.apply_xp_event(v_c.submitter_id, 'accepted_correction', 'correction', v_c.id::text,
      public.xp_rule_amount('accepted_correction'), concat('accepted-correction:', v_c.id), auth.uid(), null, null, null,
      jsonb_build_object('note_id', v_n.id, 'port_key', v_n.port_key, 'summary', left(v_c.proposed_information, 160)));
  end if;
end;
$$;

create or replace function public.set_note_highly_useful(
  p_note_id uuid, p_enabled boolean, p_reason_code text, p_reason text, p_idempotency_key uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_note public.port_notes; v_award public.note_quality_awards; v_original public.xp_ledger_entries;
begin
  if public.current_app_role() not in ('admin', 'moderator') then raise exception 'staff_required' using errcode = '42501'; end if;
  select * into v_note from public.port_notes where id = p_note_id and visibility = 'public' and moderation_state = 'approved' for update;
  if v_note.id is null or v_note.author_id is null then raise exception 'note_not_available' using errcode = 'P0002'; end if;
  if v_note.author_id = auth.uid() then raise exception 'self_award_not_allowed' using errcode = '42501'; end if;
  select * into v_award from public.note_quality_awards where note_id = p_note_id for update;
  if p_enabled then
    if v_award.note_id is not null and v_award.active then return; end if;
    if v_award.note_id is not null and not v_award.active then raise exception 'highly_useful_already_revoked' using errcode = '22023'; end if;
    if v_award.note_id is null then
      insert into public.note_quality_awards (note_id, awarded_to, reason_code, awarded_by)
      values (p_note_id, v_note.author_id, p_reason_code, auth.uid());
    else
      update public.note_quality_awards set active = true, reason_code = p_reason_code,
        awarded_by = auth.uid(), awarded_at = now(), revoked_by = null, revoked_at = null, revoke_reason = null
        where note_id = p_note_id;
    end if;
    if public.xp_system_is_live() then perform public.apply_xp_event(v_note.author_id, 'highly_useful', 'note', p_note_id::text,
      public.xp_rule_amount('highly_useful'), concat('highly-useful:', p_note_id), auth.uid(), p_reason_code, null, null,
      jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160))); end if;
    update public.port_notes set highly_useful = true where id = p_note_id;
  else
    if v_award.note_id is null or not v_award.active then return; end if;
    select * into v_original from public.xp_ledger_entries where dedupe_key = concat('highly-useful:', p_note_id);
    if public.xp_system_is_live() and v_original.id is not null then
      perform public.apply_xp_event(v_note.author_id, 'highly_useful_reversed', 'note', p_note_id::text,
        -v_original.amount, concat('highly-useful-reversed:', p_note_id), auth.uid(), 'moderation_reversal', p_reason,
        v_original.id, jsonb_build_object('summary', left(v_note.summary, 160)));
    end if;
    update public.note_quality_awards set active = false, revoked_by = auth.uid(), revoked_at = now(), revoke_reason = nullif(trim(p_reason), '') where note_id = p_note_id;
    update public.port_notes set highly_useful = false where id = p_note_id;
  end if;
end;
$$;

create or replace function public.moderate_port_note(
  p_note_id uuid, p_next_state text, p_reason text, p_idempotency_key uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_previous_state text; v_note public.port_notes;
begin
  if public.current_app_role() not in ('admin', 'moderator') then raise exception 'staff_required' using errcode = '42501'; end if;
  if p_next_state not in ('approved', 'rejected', 'quarantined') then raise exception 'invalid_moderation_state' using errcode = '22023'; end if;
  if p_next_state in ('rejected', 'quarantined') and char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'moderation_reason_required' using errcode = '22023'; end if;
  select * into v_note from public.port_notes where id = p_note_id and visibility = 'public' for update;
  if v_note.id is null then raise exception 'note_not_found' using errcode = 'P0002'; end if;
  v_previous_state := v_note.moderation_state;
  update public.port_notes set moderation_state = p_next_state, updated_at = now() where id = p_note_id;
  insert into public.moderation_events (note_id, actor_id, previous_state, next_state, reason, idempotency_key)
    values (p_note_id, auth.uid(), v_previous_state, p_next_state, nullif(trim(p_reason), ''), p_idempotency_key)
    on conflict (actor_id, idempotency_key) where idempotency_key is not null do nothing;
  if public.xp_system_is_live() and p_next_state = 'approved' and v_previous_state <> 'approved' and v_note.author_id is not null and v_note.content_origin = 'user' then
    perform public.apply_xp_event(v_note.author_id, 'approved_note', 'note', p_note_id::text,
      public.xp_rule_amount('approved_note'), concat('approved-note:', p_note_id), auth.uid(), null, null, null,
      jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160)));
  end if;
end;
$$;

create or replace function public.note_json(p_note public.port_notes)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_note.id::text, 'port_key', p_note.port_key, 'context_key', p_note.context_key,
    'topic', p_note.topic, 'visibility', p_note.visibility, 'moderation_state', p_note.moderation_state,
    'summary', p_note.summary, 'details', p_note.details,
    'public_alias', coalesce((select nickname from public.profiles where user_id = p_note.author_id), ''),
    'author_rank', case when p_note.author_id is null then null else public.xp_rank_json(p_note.author_id) end,
    'author_staff_title', (select case when role in ('admin', 'moderator') then role else null end
      from public.user_roles where user_id = p_note.author_id),
    'contact', case when public.current_app_role() in ('admin', 'moderator') and p_note.contact_is_public_business then p_note.contact else null end,
    'contact_is_public_business', p_note.contact_is_public_business, 'created_at', p_note.created_at,
    'updated_at', p_note.updated_at, 'last_verified_at', p_note.last_verified_at,
    'highly_useful', p_note.highly_useful,
    'helpful_count', (select count(*) from public.note_helpful_votes h where h.note_id = p_note.id),
    'author_id', case when auth.uid() = p_note.author_id or public.current_app_role() in ('admin', 'moderator') then p_note.author_id::text else null end,
    'accuracy', jsonb_build_object(
      'state', case
        when exists (select 1 from public.note_corrections c where c.note_id = p_note.id and c.status = 'pending') then 'needsReview'
        when (select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id
          and a.assessment_revision = p_note.confirmation_epoch and a.answer = 'stillCorrect'
          and a.confirmation_source = 'direct' and a.verified_at >= now() - interval '3 months') >= 3 then 'communityConfirmed'
        else 'needsConfirmation' end,
      'still_correct', (select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id
        and a.assessment_revision = p_note.confirmation_epoch and a.answer = 'stillCorrect'
        and a.confirmation_source = 'direct' and a.verified_at >= now() - interval '3 months'),
      'changed', (select count(*) from public.note_corrections c where c.note_id = p_note.id and c.status = 'pending'),
      'not_sure', (select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id
        and a.assessment_revision = p_note.confirmation_epoch and a.answer = 'notSure'),
      'viewer_answer', (select answer from public.note_accuracy_assessments a where a.note_id = p_note.id
        and a.user_id = auth.uid() and a.assessment_revision = p_note.confirmation_epoch)
    )
  );
$$;

create or replace function public.list_moderation_queue(
  p_state text default null, p_port_key text default null, p_topic text default null
)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when public.current_app_role() in ('admin', 'moderator') then
    coalesce(jsonb_agg(public.note_json(n) order by n.created_at), '[]'::jsonb) else '[]'::jsonb end
  from public.port_notes n where n.visibility = 'public'
    and (p_state is null or n.moderation_state = p_state)
    and (p_port_key is null or n.port_key = p_port_key)
    and (p_topic is null or n.topic = p_topic);
$$;

create or replace function public.list_admin_xp_ledger(
  p_user_id uuid default null, p_cursor text default null, p_limit integer default 50
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v_time timestamptz; v_id uuid; v_items jsonb; v_limit integer := greatest(1, least(p_limit, 100));
begin
  if public.current_app_role() <> 'admin' then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_cursor is not null then v_time := split_part(p_cursor, '|', 1)::timestamptz; v_id := split_part(p_cursor, '|', 2)::uuid; end if;
  select coalesce(jsonb_agg(row_to_json(e)), '[]'::jsonb) into v_items from (
    select l.*, coalesce(p.nickname, p.full_name) as user_label, a.current_xp
    from public.xp_ledger_entries l join public.xp_accounts a on a.user_id = l.user_id
    left join public.profiles p on p.user_id = l.user_id
    where (p_user_id is null or l.user_id = p_user_id)
      and (v_time is null or (l.created_at, l.id) < (v_time, v_id))
    order by l.created_at desc, l.id desc limit v_limit
  ) e;
  return jsonb_build_object('items', v_items,
    'next_cursor', case when jsonb_array_length(v_items) = v_limit then concat(v_items -> (v_limit - 1) ->> 'created_at', '|', v_items -> (v_limit - 1) ->> 'id') else null end);
end;
$$;

create or replace function public.apply_reputation_action(
  p_user_id uuid, p_action text, p_source_type text, p_source_id text,
  p_reason text, p_idempotency_key uuid
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_penalty integer; v_penalty_applied integer := 0; v_entry public.xp_ledger_entries; v_original public.xp_ledger_entries; v_reversed integer := 0;
begin
  if public.current_app_role() not in ('admin', 'moderator') then raise exception 'staff_required' using errcode = '42501'; end if;
  if p_action in ('coordinated_farming', 'serious_fraud', 'administrative_correction') and public.current_app_role() <> 'admin' then
    raise exception 'admin_required' using errcode = '42501'; end if;
  if p_action not in ('invalid_contribution', 'spam', 'false_information', 'confirmation_farming', 'coordinated_farming', 'serious_fraud') then
    raise exception 'invalid_reputation_action' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  for v_original in select * from public.xp_ledger_entries where user_id = p_user_id
    and source_type = p_source_type and source_id = p_source_id and amount > 0
    and not exists (select 1 from public.xp_ledger_entries r where r.reversal_of = xp_ledger_entries.id)
  loop
    select * into v_entry from public.apply_xp_event(p_user_id, 'invalid_reward_reversed', p_source_type, p_source_id,
      -v_original.amount, concat('reversal:', v_original.id), auth.uid(), p_action, p_reason, v_original.id,
      jsonb_build_object('moderation_action', p_action));
    v_reversed := v_reversed + abs(v_entry.amount);
  end loop;
  v_penalty := case p_action when 'spam' then 50 when 'false_information' then 100
    when 'confirmation_farming' then 100 when 'coordinated_farming' then 250
    when 'serious_fraud' then 500 else 0 end;
  if v_penalty > 0 then
    select * into v_entry from public.apply_xp_event(p_user_id, concat(p_action, '_penalty'), p_source_type, p_source_id,
      -v_penalty, concat('penalty:', p_idempotency_key), auth.uid(), p_action, p_reason, null,
      jsonb_build_object('nominal_penalty', v_penalty));
    v_penalty_applied := abs(v_entry.amount);
  end if;
  return jsonb_build_object('reversed_xp', v_reversed, 'penalty_xp', v_penalty_applied, 'rank', public.xp_rank_json(p_user_id));
end;
$$;

create or replace function public.preview_reputation_action(
  p_user_id uuid, p_action text, p_source_type text, p_source_id text
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v_current integer; v_reverse integer; v_penalty integer;
begin
  if public.current_app_role() not in ('admin', 'moderator') then raise exception 'staff_required' using errcode = '42501'; end if;
  if p_action in ('coordinated_farming', 'serious_fraud') and public.current_app_role() <> 'admin' then raise exception 'admin_required' using errcode = '42501'; end if;
  select coalesce(current_xp, 0) into v_current from public.xp_accounts where user_id = p_user_id;
  select coalesce(sum(l.amount), 0) into v_reverse from public.xp_ledger_entries l
    where l.user_id = p_user_id and l.source_type = p_source_type and l.source_id = p_source_id and l.amount > 0
      and not exists (select 1 from public.xp_ledger_entries r where r.reversal_of = l.id);
  v_penalty := case p_action when 'spam' then 50 when 'false_information' then 100
    when 'confirmation_farming' then 100 when 'coordinated_farming' then 250
    when 'serious_fraud' then 500 else 0 end;
  return jsonb_build_object('current_xp', v_current, 'reversal_xp', least(v_current, v_reverse),
    'penalty_xp', least(greatest(v_current - v_reverse, 0), v_penalty),
    'after_xp', greatest(v_current - v_reverse - v_penalty, 0));
end;
$$;

create or replace function public.launch_xp_system(p_launch_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_note public.port_notes; v_notes integer := 0; v_confirmed integer := 0; v_users integer := 0;
begin
  if public.current_app_role() <> 'admin' then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_launch_at is null or p_launch_at > now() then raise exception 'invalid_launch_at' using errcode = '22023'; end if;
  update public.xp_system_config set launch_at = coalesce(launch_at, p_launch_at), launched_by = coalesce(launched_by, auth.uid()), updated_at = now();
  for v_note in
    select n.* from public.port_notes n where n.author_id is not null and n.content_origin = 'user'
      and n.visibility = 'public' and n.moderation_state = 'approved' and n.created_at < p_launch_at
      and exists (select 1 from public.moderation_events m where m.note_id = n.id and m.next_state = 'approved' and m.created_at < p_launch_at)
  loop
    perform public.apply_xp_event(v_note.author_id, 'backfill_approved_note', 'note', v_note.id::text,
      public.xp_rule_amount('approved_note'), concat('approved-note:', v_note.id), auth.uid(), 'early_contribution', null, null,
      jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160), 'backfill', true));
    v_notes := v_notes + 1;
    insert into public.user_achievements (user_id, achievement_key, earned_at, metadata)
      values (v_note.author_id, 'FOUNDING_CONTRIBUTOR', p_launch_at, jsonb_build_object('launch_at', p_launch_at))
      on conflict (user_id, achievement_key) do nothing;
    if (select count(*) from public.note_accuracy_assessments a where a.note_id = v_note.id
      and a.assessment_revision = v_note.confirmation_epoch and a.confirmation_source = 'direct'
      and a.verified_at >= p_launch_at - interval '3 months' and a.created_at < p_launch_at) >= 3 then
      perform public.apply_xp_event(v_note.author_id, 'backfill_community_confirmed', 'note', v_note.id::text,
        public.xp_rule_amount('community_confirmed'), concat('community-confirmed:', v_note.id), auth.uid(), 'early_contribution', null, null,
        jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160), 'backfill', true));
      v_confirmed := v_confirmed + 1;
    end if;
  end loop;
  select count(distinct user_id) into v_users from public.user_achievements where achievement_key = 'FOUNDING_CONTRIBUTOR' and revoked_at is null;
  return jsonb_build_object('notes', v_notes, 'community_confirmed', v_confirmed, 'founding_contributors', v_users);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (user_id, full_name) values (
    new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'CrewPort Seafarer'), 80)
  ) on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'member') on conflict (user_id) do nothing;
  insert into public.xp_accounts (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

alter table public.xp_rule_definitions enable row level security;
alter table public.xp_system_config enable row level security;
alter table public.xp_accounts enable row level security;
alter table public.xp_ledger_entries enable row level security;
alter table public.note_corrections enable row level security;
alter table public.note_revisions enable row level security;
alter table public.note_quality_awards enable row level security;
alter table public.note_helpful_votes enable row level security;
alter table public.user_achievements enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-evidence', 'note-evidence', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists note_evidence_owner_insert on storage.objects;
create policy note_evidence_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'note-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists note_evidence_owner_read on storage.objects;
create policy note_evidence_owner_read on storage.objects for select to authenticated
using (bucket_id = 'note-evidence' and (
  (storage.foldername(name))[1] = auth.uid()::text
  or public.current_app_role() in ('admin', 'moderator')
));

drop policy if exists xp_accounts_owner_read on public.xp_accounts;
create policy xp_accounts_owner_read on public.xp_accounts for select using (auth.uid() = user_id);
drop policy if exists xp_ledger_owner_read on public.xp_ledger_entries;
create policy xp_ledger_owner_read on public.xp_ledger_entries for select using (auth.uid() = user_id or public.current_app_role() = 'admin');
drop policy if exists corrections_owner_or_staff_read on public.note_corrections;
create policy corrections_owner_or_staff_read on public.note_corrections for select using (
  auth.uid() = submitter_id or public.current_app_role() in ('admin', 'moderator')
);
drop policy if exists revisions_public_read on public.note_revisions;
create policy revisions_public_read on public.note_revisions for select using (
  exists (select 1 from public.port_notes n where n.id = note_id and n.visibility = 'public' and n.moderation_state = 'approved')
  or public.current_app_role() in ('admin', 'moderator')
);
drop policy if exists achievements_owner_read on public.user_achievements;
create policy achievements_owner_read on public.user_achievements for select using (auth.uid() = user_id);

revoke all on public.xp_rule_definitions, public.xp_system_config, public.xp_accounts,
  public.xp_ledger_entries, public.note_corrections, public.note_revisions,
  public.note_quality_awards, public.note_helpful_votes, public.user_achievements from anon, authenticated;
revoke execute on function public.apply_xp_event(uuid, text, text, text, integer, text, uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.xp_rule_amount(text) from public, anon, authenticated;
revoke execute on function public.xp_system_is_live() from public, anon, authenticated;

grant execute on function public.get_my_xp_summary() to authenticated;
grant execute on function public.list_my_xp_events(text, text, integer) to authenticated;
grant execute on function public.get_my_xp_event(uuid) to authenticated;
grant execute on function public.submit_verified_confirmation(uuid, text, text, text, uuid, text) to authenticated;
grant execute on function public.toggle_note_helpful(uuid, boolean) to authenticated;
grant execute on function public.submit_note_correction(uuid, text, text, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.list_correction_queue(text) to authenticated;
grant execute on function public.review_note_correction(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.set_note_highly_useful(uuid, boolean, text, text, uuid) to authenticated;
grant execute on function public.launch_xp_system(timestamptz) to authenticated;
grant execute on function public.list_admin_xp_ledger(uuid, text, integer) to authenticated;
grant execute on function public.apply_reputation_action(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.preview_reputation_action(uuid, text, text, text) to authenticated;

comment on table public.xp_ledger_entries is 'Append-only source of truth for CrewPort XP. Incorrect entries are reversed, never edited.';
comment on table public.note_revisions is 'Immutable Port Note history; current content remains denormalized on port_notes for fast reads.';

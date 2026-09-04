-- Trust confirmations remain revision-scoped in note_accuracy_assessments.
-- XP entitlement is deliberately separate and permanently keyed by user + note.
create table if not exists public.note_confirmation_xp_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.port_notes(id) on delete cascade,
  reward_amount integer not null check (reward_amount in (0, 10)),
  reward_entitled boolean not null,
  reward_active boolean not null default false,
  transition_count integer not null default 0 check (transition_count >= 0),
  first_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, note_id),
  check (reward_entitled = (reward_amount = 10)),
  check (not reward_active or reward_entitled)
);

-- Build one entitlement per historical user + note without changing ledger entries
-- or balances. Any lifetime positive confirmation reward fixes the entitlement at 10;
-- an unreversed positive reward determines whether that entitlement is currently active.
with pair_sources as (
  select a.user_id, a.note_id, min(a.created_at) as first_confirmed_at
  from public.note_accuracy_assessments a
  group by a.user_id, a.note_id
  union all
  select e.user_id, n.id, min(e.created_at)
  from public.xp_ledger_entries e
  join public.port_notes n on e.source_type = 'note' and e.source_id = n.id::text
  where e.event_type in ('verified_confirmation', 'note_confirmation_awarded', 'note_confirmation_restored')
    and e.amount > 0
  group by e.user_id, n.id
), pairs as (
  select user_id, note_id, min(first_confirmed_at) as first_confirmed_at
  from pair_sources
  group by user_id, note_id
), reward_history as (
  select e.user_id, n.id as note_id,
    bool_or(e.amount > 0) as ever_rewarded,
    bool_or(e.amount > 0 and not exists (
      select 1 from public.xp_ledger_entries reversal where reversal.reversal_of = e.id
    )) as reward_active,
    count(*) filter (where e.event_type in (
      'verified_confirmation', 'note_confirmation_awarded', 'note_confirmation_restored', 'note_confirmation_revoked'
    ))::integer as transition_count
  from public.xp_ledger_entries e
  join public.port_notes n on e.source_type = 'note' and e.source_id = n.id::text
  where e.event_type in (
    'verified_confirmation', 'note_confirmation_awarded', 'note_confirmation_restored', 'note_confirmation_revoked'
  )
  group by e.user_id, n.id
)
insert into public.note_confirmation_xp_entitlements (
  user_id, note_id, reward_amount, reward_entitled, reward_active,
  transition_count, first_confirmed_at
)
select pairs.user_id, pairs.note_id,
  case when coalesce(history.ever_rewarded, false) then 10 else 0 end,
  coalesce(history.ever_rewarded, false),
  coalesce(history.reward_active, false),
  coalesce(history.transition_count, 0),
  pairs.first_confirmed_at
from pairs
left join reward_history history
  on history.user_id = pairs.user_id and history.note_id = pairs.note_id
on conflict (user_id, note_id) do nothing;

-- These assessment columns are retained for historical compatibility but are no
-- longer authoritative for XP. The old cross-field constraint coupled XP to trust.
alter table public.note_accuracy_assessments
  drop constraint if exists note_confirmation_reward_state_valid;

alter table public.note_confirmation_xp_entitlements enable row level security;
revoke all on public.note_confirmation_xp_entitlements from anon, authenticated;

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
  v_note public.port_notes;
  v_assessment public.note_accuracy_assessments;
  v_entitlement public.note_confirmation_xp_entitlements;
  v_verified_at timestamptz;
  v_eligible boolean;
  v_first_entitlement boolean := false;
  v_duplicate boolean := false;
  v_reward integer := 0;
  v_count integer := 0;
  v_rule public.xp_rule_definitions;
  v_xp_entry public.xp_ledger_entries;
  v_previous_request public.note_confirmation_requests;
  v_response jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_idempotency_key is null then raise exception 'idempotency_key_required' using errcode = '22023'; end if;
  if p_source <> 'direct' then raise exception 'direct_verification_required' using errcode = '22023'; end if;
  if p_verification_period not in ('today', 'last7Days', 'last30Days', 'oneToThreeMonths', 'older') then
    raise exception 'invalid_verification_period' using errcode = '22023';
  end if;
  if p_evidence_path is not null then
    raise exception 'confirmation_evidence_disabled' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    concat('confirmation-request:', auth.uid(), ':', p_idempotency_key), 0
  ));
  select * into v_previous_request from public.note_confirmation_requests
  where user_id = auth.uid() and idempotency_key = p_idempotency_key;
  if v_previous_request.id is not null then
    if v_previous_request.note_id <> p_note_id or v_previous_request.action <> 'confirm' then
      raise exception 'idempotency_key_reused' using errcode = '22023';
    end if;
    return v_previous_request.response;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    concat('confirmation-state:', auth.uid(), ':', p_note_id), 0
  ));
  select * into v_note from public.port_notes where id = p_note_id
    and visibility = 'public' and moderation_state = 'approved' for update;
  if v_note.id is null then raise exception 'note_not_available' using errcode = 'P0002'; end if;
  if v_note.author_id = auth.uid() then raise exception 'self_assessment_not_allowed' using errcode = '42501'; end if;

  v_verified_at := case p_verification_period
    when 'today' then now()
    when 'last7Days' then now() - interval '3 days'
    when 'last30Days' then now() - interval '15 days'
    when 'oneToThreeMonths' then now() - interval '2 months'
    else now() - interval '4 months'
  end;
  v_eligible := p_verification_period <> 'older';

  select * into v_entitlement from public.note_confirmation_xp_entitlements
  where user_id = auth.uid() and note_id = p_note_id for update;
  if v_entitlement.user_id is null then
    v_first_entitlement := true;
    perform pg_advisory_xact_lock(hashtextextended('confirmation-xp:' || auth.uid()::text, 0));
    select * into v_rule from public.xp_rule_definitions
      where event_type = 'verified_confirmation' and enabled;
    select count(*) into v_count from public.note_confirmation_xp_entitlements
      where user_id = auth.uid() and reward_amount = 10
        and first_confirmed_at > now() - make_interval(hours => coalesce(v_rule.window_hours, 24));
    insert into public.note_confirmation_xp_entitlements (
      user_id, note_id, reward_amount, reward_entitled, reward_active, first_confirmed_at
    ) values (
      auth.uid(), p_note_id,
      case when public.xp_system_is_live() and v_eligible
        and v_rule.event_type is not null and v_rule.amount = 10
        and v_count < v_rule.rewarded_limit then 10 else 0 end,
      public.xp_system_is_live() and v_eligible
        and v_rule.event_type is not null and v_rule.amount = 10
        and v_count < v_rule.rewarded_limit,
      false, now()
    ) returning * into v_entitlement;
  end if;

  select * into v_assessment from public.note_accuracy_assessments a
  where a.note_id = p_note_id and a.user_id = auth.uid()
    and a.assessment_revision = v_note.confirmation_epoch
  for update;
  if v_assessment.note_id is not null and v_assessment.is_active then
    v_duplicate := true;
  elsif v_assessment.note_id is not null then
    update public.note_accuracy_assessments
    set is_active = true, activation_count = activation_count + 1,
      answer = 'stillCorrect', confirmation_source = 'direct',
      verification_period = p_verification_period, verified_at = v_verified_at,
      comment = nullif(left(trim(p_comment), 1000), ''),
      idempotency_key = p_idempotency_key, updated_at = now()
    where note_id = p_note_id and user_id = auth.uid()
      and assessment_revision = v_note.confirmation_epoch
    returning * into v_assessment;
  else
    insert into public.note_accuracy_assessments (
      note_id, user_id, answer, assessment_revision, confirmation_source,
      verification_period, verified_at, comment, idempotency_key,
      is_active, reward_entitled, reward_active, reward_amount, activation_count
    ) values (
      p_note_id, auth.uid(), 'stillCorrect', v_note.confirmation_epoch, 'direct',
      p_verification_period, v_verified_at, nullif(left(trim(p_comment), 1000), ''),
      p_idempotency_key, true, false, false, 0, 1
    ) returning * into v_assessment;
  end if;

  if public.xp_system_is_live() and v_entitlement.reward_amount = 10
    and not v_entitlement.reward_active then
    update public.note_confirmation_xp_entitlements
    set reward_active = true, transition_count = transition_count + 1, updated_at = now()
    where user_id = auth.uid() and note_id = p_note_id
    returning * into v_entitlement;
    select * into v_xp_entry from public.apply_xp_event(
      auth.uid(),
      case when v_first_entitlement then 'note_confirmation_awarded' else 'note_confirmation_restored' end,
      'note', p_note_id::text, 10,
      concat('confirmation-entitlement-activate:', auth.uid(), ':', p_note_id, ':', v_entitlement.transition_count),
      null, null, null, null,
      jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160))
    );
    v_reward := greatest(v_xp_entry.amount, 0);
  end if;

  if v_eligible then
    update public.port_notes
    set last_verified_at = greatest(coalesce(last_verified_at, v_verified_at), v_verified_at)
    where id = p_note_id;
  end if;
  select count(*) into v_count from public.note_accuracy_assessments a
  where a.note_id = p_note_id and a.assessment_revision = v_note.confirmation_epoch
    and a.is_active and a.answer = 'stillCorrect' and a.confirmation_source = 'direct'
    and a.verified_at >= now() - interval '3 months';
  if public.xp_system_is_live() and v_count >= 3 and v_note.author_id is not null then
    perform public.apply_xp_event(v_note.author_id, 'community_confirmed', 'note', p_note_id::text,
      public.xp_rule_amount('community_confirmed'), concat('community-confirmed:', p_note_id), null, null, null, null,
      jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160)));
  end if;
  v_response := jsonb_build_object('rewarded_xp', v_reward, 'community_confirmation_count', v_count,
    'active', true, 'duplicate', v_duplicate);
  insert into public.note_confirmation_requests (user_id, note_id, action, idempotency_key, response)
  values (auth.uid(), p_note_id, 'confirm', p_idempotency_key, v_response);
  return v_response;
end;
$$;

create or replace function public.revoke_verified_confirmation(
  p_note_id uuid,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.port_notes;
  v_assessment public.note_accuracy_assessments;
  v_entitlement public.note_confirmation_xp_entitlements;
  v_positive public.xp_ledger_entries;
  v_reversal public.xp_ledger_entries;
  v_revoked integer := 0;
  v_count integer := 0;
  v_previous_request public.note_confirmation_requests;
  v_response jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_idempotency_key is null then raise exception 'idempotency_key_required' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(
    concat('confirmation-request:', auth.uid(), ':', p_idempotency_key), 0
  ));
  select * into v_previous_request from public.note_confirmation_requests
  where user_id = auth.uid() and idempotency_key = p_idempotency_key;
  if v_previous_request.id is not null then
    if v_previous_request.note_id <> p_note_id or v_previous_request.action <> 'revoke' then
      raise exception 'idempotency_key_reused' using errcode = '22023';
    end if;
    return v_previous_request.response;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    concat('confirmation-state:', auth.uid(), ':', p_note_id), 0
  ));
  select * into v_note from public.port_notes where id = p_note_id
    and visibility = 'public' and moderation_state = 'approved' for update;
  if v_note.id is null then raise exception 'note_not_available' using errcode = 'P0002'; end if;
  if v_note.author_id = auth.uid() then raise exception 'self_assessment_not_allowed' using errcode = '42501'; end if;

  select * into v_assessment from public.note_accuracy_assessments a
  where a.note_id = p_note_id and a.user_id = auth.uid()
    and a.assessment_revision = v_note.confirmation_epoch
  for update;
  if v_assessment.note_id is null or not v_assessment.is_active then
    select count(*) into v_count from public.note_accuracy_assessments a
    where a.note_id = p_note_id and a.assessment_revision = v_note.confirmation_epoch
      and a.is_active and a.answer = 'stillCorrect' and a.confirmation_source = 'direct'
      and a.verified_at >= now() - interval '3 months';
    v_response := jsonb_build_object('revoked_xp', 0, 'community_confirmation_count', v_count,
      'active', false, 'duplicate', true);
    insert into public.note_confirmation_requests (user_id, note_id, action, idempotency_key, response)
    values (auth.uid(), p_note_id, 'revoke', p_idempotency_key, v_response);
    return v_response;
  end if;

  select * into v_entitlement from public.note_confirmation_xp_entitlements
  where user_id = auth.uid() and note_id = p_note_id for update;
  if v_entitlement.user_id is not null and v_entitlement.reward_active then
    select e.* into v_positive from public.xp_ledger_entries e
    where e.user_id = auth.uid() and e.source_type = 'note' and e.source_id = p_note_id::text
      and e.amount > 0
      and e.event_type in ('verified_confirmation', 'note_confirmation_awarded', 'note_confirmation_restored')
      and not exists (select 1 from public.xp_ledger_entries r where r.reversal_of = e.id)
    order by e.created_at desc, e.id desc limit 1;
    update public.note_confirmation_xp_entitlements
    set reward_active = false, transition_count = transition_count + 1, updated_at = now()
    where user_id = auth.uid() and note_id = p_note_id
    returning * into v_entitlement;
    if v_positive.id is not null then
      select * into v_reversal from public.apply_xp_event(
        auth.uid(), 'note_confirmation_revoked', 'note', p_note_id::text, -10,
        concat('confirmation-entitlement-revoke:', auth.uid(), ':', p_note_id, ':', v_entitlement.transition_count),
        null, 'confirmation_cancelled', null, v_positive.id,
        jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160))
      );
      v_revoked := abs(least(v_reversal.amount, 0));
    end if;
  end if;

  update public.note_accuracy_assessments
  set is_active = false, updated_at = now()
  where note_id = p_note_id and user_id = auth.uid()
    and assessment_revision = v_note.confirmation_epoch;

  select count(*) into v_count from public.note_accuracy_assessments a
  where a.note_id = p_note_id and a.assessment_revision = v_note.confirmation_epoch
    and a.is_active and a.answer = 'stillCorrect' and a.confirmation_source = 'direct'
    and a.verified_at >= now() - interval '3 months';
  v_response := jsonb_build_object('revoked_xp', v_revoked, 'community_confirmation_count', v_count,
    'active', false, 'duplicate', false);
  insert into public.note_confirmation_requests (user_id, note_id, action, idempotency_key, response)
  values (auth.uid(), p_note_id, 'revoke', p_idempotency_key, v_response);
  return v_response;
end;
$$;

revoke execute on function public.submit_verified_confirmation(uuid, text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.submit_verified_confirmation(uuid, text, text, text, uuid, text) to authenticated;
revoke execute on function public.revoke_verified_confirmation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_verified_confirmation(uuid, uuid) to authenticated;

comment on table public.note_confirmation_xp_entitlements is
  'Permanent per-user, per-note confirmation XP entitlement; independent from revision-scoped trust confirmations.';
comment on function public.submit_verified_confirmation(uuid, text, text, text, uuid, text) is
  'Activates current-revision trust and awards or restores one permanent user-note XP entitlement.';
comment on function public.revoke_verified_confirmation(uuid, uuid) is
  'Deactivates current-revision trust and revokes the active user-note XP entitlement once.';

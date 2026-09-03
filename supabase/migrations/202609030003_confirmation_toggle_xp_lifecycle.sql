alter table public.note_accuracy_assessments
  add column if not exists is_active boolean not null default true,
  add column if not exists reward_entitled boolean not null default false,
  add column if not exists reward_active boolean not null default false,
  add column if not exists reward_amount integer not null default 0 check (reward_amount >= 0),
  add column if not exists activation_count integer not null default 1 check (activation_count > 0);

with active_legacy_rewards as (
  select distinct on (a.note_id, a.user_id, a.assessment_revision)
    a.note_id, a.user_id, a.assessment_revision, greatest(e.amount, 0) as amount
  from public.note_accuracy_assessments a
  join public.xp_ledger_entries e
    on e.user_id = a.user_id and e.source_type = 'note' and e.source_id = a.note_id::text
   and e.event_type = 'verified_confirmation' and e.amount > 0
  where a.rewarded_at is not null
    and not exists (select 1 from public.xp_ledger_entries r where r.reversal_of = e.id)
  order by a.note_id, a.user_id, a.assessment_revision, e.created_at desc, e.id desc
)
update public.note_accuracy_assessments a
set reward_entitled = true,
    reward_active = true,
    reward_amount = legacy.amount
from active_legacy_rewards legacy
where a.note_id = legacy.note_id and a.user_id = legacy.user_id
  and a.assessment_revision = legacy.assessment_revision and legacy.amount > 0;

do $$
begin
  alter table public.note_accuracy_assessments
    add constraint note_confirmation_reward_state_valid check (
      (reward_entitled or reward_amount = 0)
      and (not reward_active or (is_active and reward_entitled and reward_amount > 0))
    );
exception when duplicate_object then null;
end $$;

create table if not exists public.note_confirmation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.port_notes(id) on delete cascade,
  action text not null check (action in ('confirm', 'revoke')),
  idempotency_key uuid not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

alter table public.note_confirmation_requests enable row level security;
revoke all on public.note_confirmation_requests from anon, authenticated;

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
  v_verified_at timestamptz;
  v_eligible boolean;
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

  select * into v_assessment from public.note_accuracy_assessments a
  where a.note_id = p_note_id and a.user_id = auth.uid()
    and a.assessment_revision = v_note.confirmation_epoch
  for update;

  if v_assessment.note_id is not null and v_assessment.is_active then
    select count(*) into v_count from public.note_accuracy_assessments a
    where a.note_id = p_note_id and a.assessment_revision = v_note.confirmation_epoch
      and a.is_active and a.answer = 'stillCorrect' and a.confirmation_source = 'direct'
      and a.verified_at >= now() - interval '3 months';
    v_response := jsonb_build_object('rewarded_xp', 0, 'community_confirmation_count', v_count,
      'active', true, 'duplicate', true);
    insert into public.note_confirmation_requests (user_id, note_id, action, idempotency_key, response)
    values (auth.uid(), p_note_id, 'confirm', p_idempotency_key, v_response);
    return v_response;
  end if;

  v_verified_at := case p_verification_period
    when 'today' then now()
    when 'last7Days' then now() - interval '3 days'
    when 'last30Days' then now() - interval '15 days'
    when 'oneToThreeMonths' then now() - interval '2 months'
    else now() - interval '4 months'
  end;
  v_eligible := p_verification_period <> 'older';

  if v_assessment.note_id is not null then
    update public.note_accuracy_assessments
    set is_active = true,
        activation_count = activation_count + 1,
        answer = 'stillCorrect',
        confirmation_source = 'direct',
        verification_period = p_verification_period,
        verified_at = v_verified_at,
        comment = nullif(left(trim(p_comment), 1000), ''),
        idempotency_key = p_idempotency_key,
        updated_at = now()
    where note_id = p_note_id and user_id = auth.uid()
      and assessment_revision = v_note.confirmation_epoch
    returning * into v_assessment;

    if public.xp_system_is_live() and v_assessment.reward_entitled
      and not v_assessment.reward_active and v_assessment.reward_amount > 0 then
      select * into v_xp_entry from public.apply_xp_event(
        auth.uid(), 'note_confirmation_restored', 'note', p_note_id::text,
        v_assessment.reward_amount,
        concat('confirmation-restored:', auth.uid(), ':', p_note_id, ':', v_assessment.activation_count),
        null, null, null, null,
        jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160))
      );
      v_reward := greatest(v_xp_entry.amount, 0);
      update public.note_accuracy_assessments set reward_active = v_reward > 0
      where note_id = p_note_id and user_id = auth.uid()
        and assessment_revision = v_note.confirmation_epoch;
    end if;
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

    if public.xp_system_is_live() and v_eligible then
      perform pg_advisory_xact_lock(hashtextextended('confirmation-xp:' || auth.uid()::text, 0));
      select * into v_rule from public.xp_rule_definitions
      where event_type = 'verified_confirmation' and enabled;
      select count(*) into v_count from public.xp_ledger_entries
      where user_id = auth.uid()
        and event_type in ('verified_confirmation', 'note_confirmation_awarded')
        and created_at > now() - make_interval(hours => v_rule.window_hours);
      if v_rule.event_type is not null and v_count < v_rule.rewarded_limit then
        select * into v_xp_entry from public.apply_xp_event(
          auth.uid(), 'note_confirmation_awarded', 'note', p_note_id::text,
          v_rule.amount, concat('confirmation-awarded:', auth.uid(), ':', p_note_id),
          null, null, null, null,
          jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160))
        );
        v_reward := greatest(v_xp_entry.amount, 0);
        update public.note_accuracy_assessments
        set rewarded_at = now(), reward_entitled = v_reward > 0,
            reward_active = v_reward > 0, reward_amount = v_reward
        where note_id = p_note_id and user_id = auth.uid()
          and assessment_revision = v_note.confirmation_epoch;
      end if;
    end if;
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
    'active', true, 'duplicate', false);
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

  if v_assessment.reward_entitled and v_assessment.reward_active then
    select e.* into v_positive from public.xp_ledger_entries e
    where e.user_id = auth.uid() and e.source_type = 'note' and e.source_id = p_note_id::text
      and e.amount > 0
      and e.event_type in ('verified_confirmation', 'note_confirmation_awarded', 'note_confirmation_restored')
      and not exists (select 1 from public.xp_ledger_entries r where r.reversal_of = e.id)
    order by e.created_at desc, e.id desc limit 1;
    if v_positive.id is not null then
      select * into v_reversal from public.apply_xp_event(
        auth.uid(), 'note_confirmation_revoked', 'note', p_note_id::text,
        -v_assessment.reward_amount,
        concat('confirmation-revoked:', auth.uid(), ':', p_note_id, ':', v_assessment.activation_count),
        null, 'confirmation_cancelled', null, v_positive.id,
        jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160))
      );
      v_revoked := abs(least(v_reversal.amount, 0));
    end if;
  end if;

  update public.note_accuracy_assessments
  set is_active = false,
      reward_active = false,
      reward_amount = case when reward_entitled then v_revoked else 0 end,
      updated_at = now()
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
    'contact_is_public_business', p_note.contact_is_public_business,
    'created_at', p_note.created_at, 'updated_at', p_note.updated_at,
    'last_verified_at', p_note.last_verified_at,
    'feedback_count', (select count(*) from public.note_feedback f
      where f.note_id = p_note.id and f.status = 'approved' and f.deleted_at is null),
    'feedback_change_alert', (select jsonb_build_object('feedback_id', c.source_feedback_id::text)
      from public.note_corrections c
      join public.note_feedback f on f.id = c.source_feedback_id
      where c.note_id = p_note.id and c.status = 'pending'
        and f.status = 'approved' and f.deleted_at is null
      order by c.created_at desc limit 1),
    'author_id', case when auth.uid() = p_note.author_id or public.current_app_role() in ('admin', 'moderator') then p_note.author_id::text else null end,
    'accuracy', jsonb_build_object(
      'state', case
        when exists (select 1 from public.note_corrections c where c.note_id = p_note.id and c.status = 'pending') then 'needsReview'
        when (select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id
          and a.assessment_revision = p_note.confirmation_epoch and a.is_active and a.answer = 'stillCorrect'
          and a.confirmation_source = 'direct' and a.verified_at >= now() - interval '3 months') >= 3 then 'communityConfirmed'
        else 'needsConfirmation' end,
      'still_correct', (select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id
        and a.assessment_revision = p_note.confirmation_epoch and a.is_active and a.answer = 'stillCorrect'
        and a.confirmation_source = 'direct' and a.verified_at >= now() - interval '3 months'),
      'changed', (select count(*) from public.note_corrections c where c.note_id = p_note.id and c.status = 'pending'),
      'not_sure', 0,
      'viewer_answer', (select answer from public.note_accuracy_assessments a where a.note_id = p_note.id
        and a.user_id = auth.uid() and a.assessment_revision = p_note.confirmation_epoch and a.is_active)
    )
  );
$$;

revoke execute on function public.revoke_verified_confirmation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_verified_confirmation(uuid, uuid) to authenticated;

comment on function public.revoke_verified_confirmation(uuid, uuid) is
  'Atomically deactivates the current user confirmation and reverses its active XP reward once.';

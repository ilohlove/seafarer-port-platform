-- CrewPort Note Trust + Feedback + XP V1.
-- Helpful/quality data is retained for audit compatibility, but no longer writable or rewarded.

update public.xp_rule_definitions
set enabled = false
where event_type = 'highly_useful';

revoke execute on function public.toggle_note_helpful(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.set_note_highly_useful(uuid, boolean, text, text, uuid) from public, anon, authenticated;

alter table public.note_corrections
  drop constraint if exists note_corrections_field_type_check;
alter table public.note_corrections
  add constraint note_corrections_field_type_check check (field_type in (
    'price', 'location', 'hours', 'contact', 'service', 'operatingStatus', 'transport', 'other'
  ));

create table if not exists public.note_feedback (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.port_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderation_reason text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  idempotency_key uuid not null,
  used_by_correction_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, idempotency_key)
);

create index if not exists note_feedback_public_list
  on public.note_feedback (note_id, created_at desc, id desc)
  where status = 'approved' and deleted_at is null;
create index if not exists note_feedback_moderation_queue
  on public.note_feedback (status, created_at asc)
  where deleted_at is null;

alter table public.note_corrections
  add column if not exists source_feedback_id uuid references public.note_feedback(id) on delete set null;

do $$ begin
  alter table public.note_feedback
    add constraint note_feedback_used_correction_fk
    foreign key (used_by_correction_id) references public.note_corrections(id) on delete set null;
exception when duplicate_object then null;
end $$;

create or replace function public.note_feedback_json(p_feedback public.note_feedback)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_feedback.id::text,
    'note_id', p_feedback.note_id::text,
    'body', p_feedback.body,
    'status', p_feedback.status,
    'public_alias', coalesce((select nickname from public.profiles where user_id = p_feedback.user_id), ''),
    'author_rank', public.xp_rank_json(p_feedback.user_id),
    'author_staff_title', (select case when role in ('admin', 'moderator') then role else null end
      from public.user_roles where user_id = p_feedback.user_id),
    'author_id', case when auth.uid() = p_feedback.user_id or public.current_app_role() in ('admin', 'moderator')
      then p_feedback.user_id::text else null end,
    'used_for_correction', p_feedback.used_by_correction_id is not null,
    'created_at', p_feedback.created_at,
    'updated_at', p_feedback.updated_at
  );
$$;

create or replace function public.list_note_feedback(
  p_note_id uuid,
  p_cursor text default null,
  p_limit integer default 2
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_time timestamptz;
  v_id uuid;
  v_limit integer := least(greatest(coalesce(p_limit, 2), 1), 20);
  v_items jsonb;
  v_last jsonb;
begin
  if not exists (
    select 1 from public.port_notes
    where id = p_note_id and visibility = 'public' and moderation_state = 'approved'
  ) then raise exception 'note_not_available' using errcode = 'P0002'; end if;
  if p_cursor is not null then
    v_time := split_part(p_cursor, '|', 1)::timestamptz;
    v_id := split_part(p_cursor, '|', 2)::uuid;
  end if;
  select coalesce(jsonb_agg(public.note_feedback_json((f.*)::public.note_feedback)), '[]'::jsonb) into v_items
  from (
    select item.* from public.note_feedback item
    where item.note_id = p_note_id and item.deleted_at is null
      and (item.status = 'approved' or item.user_id = auth.uid())
      and (v_time is null or (item.created_at, item.id) < (v_time, v_id))
    order by item.created_at desc, item.id desc
    limit v_limit + 1
  ) f;
  if jsonb_array_length(v_items) > v_limit then
    v_last := v_items -> (v_limit - 1);
    return jsonb_build_object(
      'items', v_items - v_limit,
      'next_cursor', concat(v_last ->> 'created_at', '|', v_last ->> 'id')
    );
  end if;
  return jsonb_build_object('items', v_items, 'next_cursor', null);
end;
$$;

create or replace function public.get_note_feedback(p_feedback_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_feedback public.note_feedback;
begin
  select f.* into v_feedback
  from public.note_feedback f
  join public.port_notes n on n.id = f.note_id
  where f.id = p_feedback_id and f.deleted_at is null
    and n.visibility = 'public' and n.moderation_state = 'approved'
    and (
      f.status = 'approved'
      or f.user_id = auth.uid()
      or public.current_app_role() in ('admin', 'moderator')
    );
  if v_feedback.id is null then raise exception 'feedback_not_found' using errcode = 'P0002'; end if;
  return public.note_feedback_json(v_feedback);
end;
$$;

create or replace function public.submit_note_feedback(
  p_note_id uuid,
  p_body text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_feedback public.note_feedback;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'invalid_feedback' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.port_notes
    where id = p_note_id and visibility = 'public' and moderation_state = 'approved'
  ) then raise exception 'note_not_available' using errcode = 'P0002'; end if;
  insert into public.note_feedback (note_id, user_id, body, idempotency_key)
  values (p_note_id, auth.uid(), trim(p_body), p_idempotency_key)
  on conflict (user_id, idempotency_key) do update
    set updated_at = public.note_feedback.updated_at
  returning * into v_feedback;
  return public.note_feedback_json(v_feedback);
end;
$$;

create or replace function public.update_note_feedback(p_feedback_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_feedback public.note_feedback;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'invalid_feedback' using errcode = '22023';
  end if;
  select * into v_feedback from public.note_feedback
    where id = p_feedback_id and user_id = auth.uid() and deleted_at is null for update;
  if v_feedback.id is null then raise exception 'feedback_not_found' using errcode = 'P0002'; end if;
  update public.note_feedback set body = trim(p_body), status = 'pending',
    moderation_reason = null, moderated_by = null, moderated_at = null, updated_at = now()
    where id = p_feedback_id returning * into v_feedback;
  return public.note_feedback_json(v_feedback);
end;
$$;

create or replace function public.delete_note_feedback(p_feedback_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  update public.note_feedback set deleted_at = now(), updated_at = now()
  where id = p_feedback_id and user_id = auth.uid() and deleted_at is null;
  if not found then raise exception 'feedback_not_found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.list_feedback_moderation_queue(p_status text default 'pending')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.current_app_role() in ('admin', 'moderator') then
    coalesce(jsonb_agg(public.note_feedback_json(f) || jsonb_build_object(
      'note_summary', n.summary,
      'port_key', n.port_key,
      'moderation_reason', f.moderation_reason
    ) order by f.created_at asc), '[]'::jsonb)
  else '[]'::jsonb end
  from public.note_feedback f
  join public.port_notes n on n.id = f.note_id
  where f.status = p_status and f.deleted_at is null;
$$;

create or replace function public.review_note_feedback(
  p_feedback_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_feedback public.note_feedback;
begin
  if public.current_app_role() not in ('admin', 'moderator') then
    raise exception 'staff_required' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'moderation_reason_required' using errcode = '22023';
  end if;
  select * into v_feedback from public.note_feedback
    where id = p_feedback_id and status = 'pending' and deleted_at is null for update;
  if v_feedback.id is null then raise exception 'feedback_not_pending' using errcode = 'P0002'; end if;
  if v_feedback.user_id = auth.uid() then raise exception 'self_review_not_allowed' using errcode = '42501'; end if;
  update public.note_feedback set status = p_decision,
    moderation_reason = nullif(trim(p_reason), ''), moderated_by = auth.uid(),
    moderated_at = now(), updated_at = now()
  where id = p_feedback_id;
end;
$$;

create or replace function public.submit_note_correction_from_feedback(
  p_feedback_id uuid,
  p_action text,
  p_field_type text,
  p_current_information text,
  p_proposed_information text,
  p_verification_period text,
  p_note text,
  p_evidence_path text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feedback public.note_feedback;
  v_correction public.note_corrections;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select * into v_feedback from public.note_feedback
  where id = p_feedback_id and deleted_at is null;
  if v_feedback.id is null then raise exception 'feedback_not_found' using errcode = 'P0002'; end if;
  if v_feedback.user_id <> auth.uid() and public.current_app_role() not in ('admin', 'moderator') then
    raise exception 'feedback_owner_or_staff_required' using errcode = '42501';
  end if;
  if p_evidence_path is not null and split_part(p_evidence_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_evidence_path' using errcode = '42501';
  end if;
  if not exists (select 1 from public.port_notes where id = v_feedback.note_id and visibility = 'public' and moderation_state = 'approved') then
    raise exception 'note_not_available' using errcode = 'P0002';
  end if;
  insert into public.note_corrections (
    note_id, submitter_id, action, field_type, current_information,
    proposed_information, verification_period, note, evidence_path,
    idempotency_key, source_feedback_id
  ) values (
    v_feedback.note_id, v_feedback.user_id, p_action, p_field_type,
    trim(p_current_information), trim(p_proposed_information),
    p_verification_period, nullif(trim(p_note), ''),
    nullif(trim(p_evidence_path), ''), p_idempotency_key, p_feedback_id
  ) on conflict (submitter_id, idempotency_key) do update
    set updated_at = public.note_corrections.updated_at
  returning * into v_correction;
  return to_jsonb(v_correction) - 'submitter_id';
end;
$$;

create or replace function public.mark_feedback_used_by_correction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' and new.source_feedback_id is not null then
    update public.note_feedback
    set used_by_correction_id = new.id, updated_at = now()
    where id = new.source_feedback_id and note_id = new.note_id and deleted_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists note_correction_marks_feedback_used on public.note_corrections;
create trigger note_correction_marks_feedback_used
after update of status on public.note_corrections
for each row execute function public.mark_feedback_used_by_correction();

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
  v_verified_at timestamptz;
  v_eligible boolean;
  v_reward integer := 0;
  v_count integer := 0;
  v_rule public.xp_rule_definitions;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_source <> 'direct' then raise exception 'direct_verification_required' using errcode = '22023'; end if;
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

  select count(*) into v_count from public.note_accuracy_assessments a
  where a.note_id = p_note_id and a.user_id = auth.uid()
    and a.assessment_revision = v_note.confirmation_epoch
    and a.answer = 'stillCorrect' and a.confirmation_source = 'direct';
  if v_count > 0 then
    select count(*) into v_count from public.note_accuracy_assessments a
    where a.note_id = p_note_id and a.assessment_revision = v_note.confirmation_epoch
      and a.answer = 'stillCorrect' and a.confirmation_source = 'direct'
      and a.verified_at >= now() - interval '3 months';
    return jsonb_build_object('rewarded_xp', 0, 'community_confirmation_count', v_count, 'duplicate', true);
  end if;

  v_verified_at := case p_verification_period
    when 'today' then now()
    when 'last7Days' then now() - interval '3 days'
    when 'last30Days' then now() - interval '15 days'
    when 'oneToThreeMonths' then now() - interval '2 months'
    else now() - interval '4 months'
  end;
  v_eligible := p_verification_period <> 'older';
  insert into public.note_accuracy_assessments (
    note_id, user_id, answer, assessment_revision, confirmation_source,
    verification_period, verified_at, comment, evidence_path, idempotency_key
  ) values (
    p_note_id, auth.uid(), 'stillCorrect', v_note.confirmation_epoch, 'direct',
    p_verification_period, v_verified_at, nullif(left(trim(p_comment), 1000), ''),
    nullif(trim(p_evidence_path), ''), p_idempotency_key
  ) on conflict (note_id, user_id, assessment_revision) do update set
    answer = 'stillCorrect', confirmation_source = 'direct',
    verification_period = excluded.verification_period, verified_at = excluded.verified_at,
    comment = excluded.comment, evidence_path = excluded.evidence_path,
    idempotency_key = excluded.idempotency_key, updated_at = now();

  if public.xp_system_is_live() and v_eligible then
    perform pg_advisory_xact_lock(hashtextextended('confirmation-xp:' || auth.uid()::text, 0));
    if not exists (
      select 1 from public.xp_ledger_entries
      where dedupe_key = concat('confirmation:', auth.uid(), ':', p_note_id)
    ) then
      select * into v_rule from public.xp_rule_definitions
      where event_type = 'verified_confirmation' and enabled;
      select count(*) into v_count from public.xp_ledger_entries
      where user_id = auth.uid() and event_type = 'verified_confirmation'
        and created_at > now() - make_interval(hours => v_rule.window_hours);
      if v_rule.event_type is not null and v_count < v_rule.rewarded_limit then
        perform public.apply_xp_event(auth.uid(), 'verified_confirmation', 'note', p_note_id::text,
          v_rule.amount, concat('confirmation:', auth.uid(), ':', p_note_id), null, null, null, null,
          jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160)));
        v_reward := v_rule.amount;
        update public.note_accuracy_assessments set rewarded_at = now()
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
    and a.answer = 'stillCorrect' and a.confirmation_source = 'direct'
    and a.verified_at >= now() - interval '3 months';
  if public.xp_system_is_live() and v_count >= 3 and v_note.author_id is not null then
    perform public.apply_xp_event(v_note.author_id, 'community_confirmed', 'note', p_note_id::text,
      public.xp_rule_amount('community_confirmed'), concat('community-confirmed:', p_note_id), null, null, null, null,
      jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160)));
  end if;
  return jsonb_build_object('rewarded_xp', v_reward, 'community_confirmation_count', v_count, 'duplicate', false);
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
          and a.assessment_revision = p_note.confirmation_epoch and a.answer = 'stillCorrect'
          and a.confirmation_source = 'direct' and a.verified_at >= now() - interval '3 months') >= 3 then 'communityConfirmed'
        else 'needsConfirmation' end,
      'still_correct', (select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id
        and a.assessment_revision = p_note.confirmation_epoch and a.answer = 'stillCorrect'
        and a.confirmation_source = 'direct' and a.verified_at >= now() - interval '3 months'),
      'changed', (select count(*) from public.note_corrections c where c.note_id = p_note.id and c.status = 'pending'),
      'not_sure', 0,
      'viewer_answer', (select answer from public.note_accuracy_assessments a where a.note_id = p_note.id
        and a.user_id = auth.uid() and a.assessment_revision = p_note.confirmation_epoch)
    )
  );
$$;

alter table public.note_feedback enable row level security;
revoke all on public.note_feedback from anon, authenticated;
revoke execute on function public.note_feedback_json(public.note_feedback) from public, anon, authenticated;
revoke execute on function public.list_note_feedback(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.get_note_feedback(uuid) from public, anon, authenticated;
revoke execute on function public.submit_note_feedback(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.update_note_feedback(uuid, text) from public, anon, authenticated;
revoke execute on function public.delete_note_feedback(uuid) from public, anon, authenticated;
revoke execute on function public.list_feedback_moderation_queue(text) from public, anon, authenticated;
revoke execute on function public.review_note_feedback(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.submit_note_correction_from_feedback(uuid, text, text, text, text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.mark_feedback_used_by_correction() from public, anon, authenticated;
grant execute on function public.list_note_feedback(uuid, text, integer) to anon, authenticated;
grant execute on function public.get_note_feedback(uuid) to anon, authenticated;
grant execute on function public.submit_note_feedback(uuid, text, uuid) to authenticated;
grant execute on function public.update_note_feedback(uuid, text) to authenticated;
grant execute on function public.delete_note_feedback(uuid) to authenticated;
grant execute on function public.list_feedback_moderation_queue(text) to authenticated;
grant execute on function public.review_note_feedback(uuid, text, text) to authenticated;
grant execute on function public.submit_note_correction_from_feedback(uuid, text, text, text, text, text, text, text, uuid) to authenticated;

comment on table public.note_feedback is 'One-level moderated feedback under a canonical Port Note; feedback never awards XP.';
comment on table public.note_helpful_votes is 'Deprecated historical V0 data. Not exposed or writable in Note Trust V1.';

-- Structured, topic-aware Port Note corrections with partial moderation.

alter table public.note_corrections
  add column if not exists base_revision_id uuid references public.note_revisions(id) on delete set null,
  add column if not exists review_idempotency_key uuid,
  add column if not exists contact_permission_confirmed boolean not null default false;

alter table public.note_corrections drop constraint if exists note_corrections_status_check;
alter table public.note_corrections add constraint note_corrections_status_check
  check (status in ('pending', 'accepted', 'partiallyAccepted', 'rejected'));

create unique index if not exists note_corrections_review_idempotency
  on public.note_corrections (decided_by, review_idempotency_key)
  where review_idempotency_key is not null;

create table if not exists public.note_correction_items (
  id uuid primary key default gen_random_uuid(),
  correction_id uuid not null references public.note_corrections(id) on delete cascade,
  field_key text not null check (char_length(field_key) between 1 and 80 and field_key <> 'context'),
  current_value text,
  proposed_value text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (correction_id, field_key),
  check (current_value is distinct from proposed_value)
);

create index if not exists note_correction_items_parent
  on public.note_correction_items (correction_id, created_at);

update public.note_corrections c
set base_revision_id = n.current_revision_id
from public.port_notes n
where n.id = c.note_id and c.base_revision_id is null;

insert into public.note_correction_items
  (correction_id, field_key, current_value, proposed_value, status, created_at)
select c.id, 'summary', c.current_information, c.proposed_information,
  case when c.status = 'rejected' then 'rejected'
       when c.status in ('accepted', 'partiallyAccepted') then 'accepted'
       else 'pending' end,
  c.created_at
from public.note_corrections c
where not exists (
  select 1 from public.note_correction_items i where i.correction_id = c.id
)
on conflict (correction_id, field_key) do nothing;

create or replace function public.port_note_correction_field_allowed(p_topic text, p_key text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_key = 'summary' or p_key in ('common.price', 'common.place', 'common.extra') or
    (p_topic = 'esim' and p_key in ('esim.price', 'esim.data', 'esim.days', 'esim.hotspot', 'esim.signal', 'esim.website')) or
    (p_topic = 'physicalSim' and p_key in ('physicalSim.seller', 'physicalSim.fairPrice', 'physicalSim.passport', 'physicalSim.delivery', 'physicalSim.contact')) or
    (p_topic = 'shoreLeave' and p_key in ('shoreLeave.pickup', 'shoreLeave.rideApp', 'shoreLeave.price', 'shoreLeave.agreeFare', 'shoreLeave.avoid')) or
    (p_topic = 'food' and p_key in ('food.seller', 'food.where', 'food.price', 'food.shipDelivery', 'food.recommendation')) or
    (p_topic = 'shopping' and p_key in ('shopping.supermarket', 'shopping.cosmetics', 'shopping.supplements', 'shopping.gift', 'shopping.goodPrice')) or
    (p_topic = 'welfare' and p_key in ('welfare.wifi', 'welfare.shuttle', 'welfare.sim', 'welfare.currency', 'welfare.contact', 'welfare.hours')) or
    (p_topic = 'general' and p_key in ('general.try', 'general.avoid', 'general.cost', 'general.location', 'general.contact'));
$$;

create or replace function public.submit_structured_note_correction(
  p_note_id uuid,
  p_changes jsonb,
  p_verification_period text,
  p_note text,
  p_evidence_path text,
  p_contact_permission_confirmed boolean,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.port_notes;
  v_correction public.note_corrections;
  v_change jsonb;
  v_key text;
  v_current text;
  v_proposed text;
  v_actual text;
  v_has_existing boolean := false;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_idempotency_key is null then raise exception 'idempotency_required' using errcode = '22023'; end if;
  if p_evidence_path is not null and split_part(p_evidence_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_evidence_path' using errcode = '42501';
  end if;
  if p_verification_period not in ('today', 'last7Days', 'last30Days', 'oneToThreeMonths', 'older') then
    raise exception 'invalid_verification_period' using errcode = '22023';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) not between 1 and 15 then
    raise exception 'invalid_correction_changes' using errcode = '22023';
  end if;

  select * into v_note from public.port_notes
  where id = p_note_id and visibility = 'public' and moderation_state = 'approved'
  for share;
  if v_note.id is null then raise exception 'note_not_available' using errcode = 'P0002'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_changes) c
    group by c ->> 'field_key' having count(*) > 1
  ) then raise exception 'duplicate_correction_field' using errcode = '22023'; end if;

  for v_change in select * from jsonb_array_elements(p_changes)
  loop
    if jsonb_typeof(v_change) <> 'object' then raise exception 'invalid_correction_change' using errcode = '22023'; end if;
    if (v_change ? 'current_value' and v_change -> 'current_value' <> 'null'::jsonb and jsonb_typeof(v_change -> 'current_value') <> 'string')
      or (v_change ? 'proposed_value' and v_change -> 'proposed_value' <> 'null'::jsonb and jsonb_typeof(v_change -> 'proposed_value') <> 'string') then
      raise exception 'invalid_correction_value' using errcode = '22023';
    end if;
    v_key := trim(coalesce(v_change ->> 'field_key', ''));
    v_current := nullif(v_change ->> 'current_value', '');
    v_proposed := nullif(trim(coalesce(v_change ->> 'proposed_value', '')), '');
    if v_key = 'context' or not (public.port_note_correction_field_allowed(v_note.topic, v_key) or v_note.details ? v_key) then
      raise exception 'invalid_correction_field' using errcode = '22023';
    end if;
    if v_key = 'summary' then
      v_actual := v_note.summary;
      if v_proposed is null or char_length(v_proposed) > 800 then raise exception 'invalid_correction_summary' using errcode = '22023'; end if;
    else
      v_actual := v_note.details ->> v_key;
      if v_proposed is not null and char_length(v_proposed) > public.port_note_detail_hard_limit(v_key) then
        raise exception 'note_detail_too_long' using errcode = '22023';
      end if;
    end if;
    if v_actual is distinct from v_current then raise exception 'correction_stale' using errcode = '40001'; end if;
    if v_actual is not distinct from v_proposed then raise exception 'unchanged_correction_field' using errcode = '22023'; end if;
    if v_key like '%.contact' and v_proposed is not null and not coalesce(p_contact_permission_confirmed, false) then
      raise exception 'contact_permission_required' using errcode = '42501';
    end if;
    v_has_existing := v_has_existing or v_actual is not null;
  end loop;

  insert into public.note_corrections (
    note_id, submitter_id, action, field_type, current_information, proposed_information,
    verification_period, note, evidence_path, idempotency_key, base_revision_id,
    contact_permission_confirmed
  ) values (
    v_note.id, auth.uid(), case when v_has_existing then 'UPDATE' else 'ADD' end, 'other',
    v_note.summary, v_note.summary, p_verification_period, nullif(trim(p_note), ''),
    nullif(trim(p_evidence_path), ''), p_idempotency_key, v_note.current_revision_id,
    coalesce(p_contact_permission_confirmed, false)
  ) on conflict (submitter_id, idempotency_key) do update
    set updated_at = public.note_corrections.updated_at
  returning * into v_correction;

  if not exists (select 1 from public.note_correction_items where correction_id = v_correction.id) then
    for v_change in select * from jsonb_array_elements(p_changes)
    loop
      insert into public.note_correction_items (correction_id, field_key, current_value, proposed_value)
      values (
        v_correction.id,
        trim(v_change ->> 'field_key'),
        nullif(v_change ->> 'current_value', ''),
        nullif(trim(coalesce(v_change ->> 'proposed_value', '')), '')
      );
    end loop;
  end if;
  return jsonb_build_object('id', v_correction.id, 'status', v_correction.status);
end;
$$;

create or replace function public.list_correction_queue(p_status text default 'pending')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.current_app_role() in ('admin', 'moderator') then
    coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'note_id', c.note_id, 'topic', n.topic, 'action', c.action,
      'field_type', c.field_type, 'current_information', c.current_information,
      'proposed_information', c.proposed_information, 'verification_period', c.verification_period,
      'note', c.note, 'evidence_path', c.evidence_path, 'status', c.status, 'impact', c.impact,
      'created_at', c.created_at, 'note_summary', n.summary, 'port_key', n.port_key,
      'submitter_alias', coalesce(p.nickname, ''),
      'changes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'field_key', i.field_key, 'current_value', i.current_value,
        'proposed_value', i.proposed_value, 'status', i.status
      ) order by i.created_at, i.id) from public.note_correction_items i where i.correction_id = c.id), '[]'::jsonb)
    ) order by c.created_at), '[]'::jsonb) else '[]'::jsonb end
  from public.note_corrections c
  join public.port_notes n on n.id = c.note_id
  left join public.profiles p on p.user_id = c.submitter_id
  where case when p_status = 'accepted' then c.status in ('accepted', 'partiallyAccepted') else c.status = p_status end;
$$;

create or replace function public.review_structured_note_correction(
  p_correction_id uuid,
  p_decision text,
  p_accepted_item_ids uuid[],
  p_impact text,
  p_reason text,
  p_idempotency_key uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c public.note_corrections;
  v_n public.port_notes;
  v_revision public.note_revisions;
  v_item public.note_correction_items;
  v_number integer;
  v_total integer;
  v_accepted integer;
  v_summary text;
  v_details jsonb;
  v_actual text;
begin
  if public.current_app_role() not in ('admin', 'moderator') then raise exception 'staff_required' using errcode = '42501'; end if;
  if p_decision not in ('accepted', 'rejected') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  if p_decision = 'accepted' and p_impact not in ('minor', 'material') then raise exception 'impact_required' using errcode = '22023'; end if;
  if p_idempotency_key is null then raise exception 'idempotency_required' using errcode = '22023'; end if;

  select * into v_c from public.note_corrections where id = p_correction_id for update;
  if v_c.id is null then raise exception 'correction_not_found' using errcode = 'P0002'; end if;
  if v_c.status <> 'pending' then
    if v_c.review_idempotency_key = p_idempotency_key and v_c.decided_by = auth.uid() then return; end if;
    raise exception 'correction_not_pending' using errcode = 'P0002';
  end if;
  select * into v_n from public.port_notes where id = v_c.note_id for update;
  if auth.uid() in (v_c.submitter_id, v_n.author_id) then raise exception 'self_review_not_allowed' using errcode = '42501'; end if;
  select count(*) into v_total from public.note_correction_items where correction_id = v_c.id;
  if v_total = 0 then raise exception 'correction_items_required' using errcode = '22023'; end if;

  if p_decision = 'rejected' then
    update public.note_correction_items set status = 'rejected' where correction_id = v_c.id;
    update public.note_corrections set status = 'rejected', impact = null,
      decision_reason = nullif(trim(p_reason), ''), decided_by = auth.uid(), decided_at = now(),
      review_idempotency_key = p_idempotency_key, updated_at = now() where id = v_c.id;
    return;
  end if;

  select count(distinct item_id) into v_accepted
  from unnest(coalesce(p_accepted_item_ids, array[]::uuid[])) item_id
  where exists (select 1 from public.note_correction_items i where i.id = item_id and i.correction_id = v_c.id);
  if v_accepted = 0 or v_accepted <> cardinality(coalesce(p_accepted_item_ids, array[]::uuid[])) then
    raise exception 'invalid_accepted_items' using errcode = '22023';
  end if;

  v_summary := v_n.summary;
  v_details := v_n.details;
  for v_item in select * from public.note_correction_items
    where correction_id = v_c.id and id = any(p_accepted_item_ids)
    order by created_at, id
  loop
    v_actual := case when v_item.field_key = 'summary' then v_n.summary else v_n.details ->> v_item.field_key end;
    if v_actual is distinct from v_item.current_value then raise exception 'correction_stale' using errcode = '40001'; end if;
    if v_item.field_key = 'summary' then
      v_summary := v_item.proposed_value;
    elsif v_item.proposed_value is null then
      v_details := v_details - v_item.field_key;
    else
      v_details := jsonb_set(v_details, array[v_item.field_key], to_jsonb(v_item.proposed_value), true);
    end if;
  end loop;

  update public.note_correction_items set status = case when id = any(p_accepted_item_ids) then 'accepted' else 'rejected' end
  where correction_id = v_c.id;
  update public.note_corrections set
    status = case when v_accepted = v_total then 'accepted' else 'partiallyAccepted' end,
    impact = p_impact, decision_reason = nullif(trim(p_reason), ''), decided_by = auth.uid(),
    decided_at = now(), review_idempotency_key = p_idempotency_key, updated_at = now()
  where id = v_c.id;

  select coalesce(max(revision_number), 0) + 1 into v_number from public.note_revisions where note_id = v_n.id;
  insert into public.note_revisions (
    note_id, revision_number, summary, details, contact, correction_id, created_by, approved_by, impact
  ) values (
    v_n.id, v_number, v_summary, v_details, v_n.contact, v_c.id, v_c.submitter_id, auth.uid(), p_impact
  ) returning * into v_revision;
  update public.port_notes set summary = v_summary, details = v_details, current_revision_id = v_revision.id,
    confirmation_epoch = confirmation_epoch + case when p_impact = 'material' then 1 else 0 end,
    updated_at = now() where id = v_n.id;

  if public.xp_system_is_live() and v_c.submitter_id <> v_n.author_id then
    perform public.apply_xp_event(v_c.submitter_id, 'accepted_correction', 'correction', v_c.id::text,
      public.xp_rule_amount('accepted_correction'), concat('accepted-correction:', v_c.id), auth.uid(), null, null, null,
      jsonb_build_object('note_id', v_n.id, 'port_key', v_n.port_key, 'summary', left(v_summary, 160), 'accepted_fields', v_accepted));
  end if;
end;
$$;

alter table public.note_correction_items enable row level security;
revoke all on public.note_correction_items from anon, authenticated;
revoke execute on function public.port_note_correction_field_allowed(text, text) from public, anon, authenticated;
revoke execute on function public.submit_note_correction(uuid, text, text, text, text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.review_note_correction(uuid, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.submit_note_correction_from_feedback(uuid, text, text, text, text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.submit_structured_note_correction(uuid, jsonb, text, text, text, boolean, uuid) from public, anon, authenticated;
revoke execute on function public.review_structured_note_correction(uuid, text, uuid[], text, text, uuid) from public, anon, authenticated;
grant execute on function public.submit_structured_note_correction(uuid, jsonb, text, text, text, boolean, uuid) to authenticated;
grant execute on function public.review_structured_note_correction(uuid, text, uuid[], text, text, uuid) to authenticated;

comment on table public.note_correction_items is
  'Field-level proposed changes for a moderated Port Note correction.';

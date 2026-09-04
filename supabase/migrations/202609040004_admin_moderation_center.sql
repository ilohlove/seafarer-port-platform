-- CrewPort Moderation Center V1: bounded feedback queue and lazy context.

create index if not exists note_feedback_moderation_cursor
  on public.note_feedback (status, created_at, id)
  where deleted_at is null;

create or replace function public.list_feedback_moderation_queue_v2(
  p_status text default 'pending',
  p_port_key text default null,
  p_topic text default null,
  p_priority text default null,
  p_sort text default 'oldest',
  p_cursor text default null,
  p_limit integer default 25
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
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  v_items jsonb;
  v_last jsonb;
begin
  if public.current_app_role() not in ('admin', 'moderator') then
    raise exception 'staff_required' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid_feedback_status' using errcode = '22023';
  end if;
  if p_sort not in ('oldest', 'newest') then
    raise exception 'invalid_feedback_sort' using errcode = '22023';
  end if;
  if p_priority is not null and p_priority not in ('P0', 'P1', 'P2') then
    raise exception 'invalid_feedback_priority' using errcode = '22023';
  end if;
  if p_topic is not null and p_topic not in ('esim', 'physicalSim', 'shoreLeave', 'food', 'shopping', 'welfare', 'general') then
    raise exception 'invalid_note_topic' using errcode = '22023';
  end if;
  if p_cursor is not null then
    v_time := split_part(p_cursor, '|', 1)::timestamptz;
    v_id := split_part(p_cursor, '|', 2)::uuid;
  end if;

  with candidates as (
    select
      f.created_at,
      f.id,
      case when n.topic = 'shoreLeave' then 'P0'
           when n.topic in ('esim', 'physicalSim') then 'P1'
           else 'P2' end as priority,
      public.note_feedback_json(f) || jsonb_build_object(
        'note_summary', n.summary,
        'port_key', n.port_key,
        'note_context_key', n.context_key,
        'note_topic', n.topic,
        'note_trust_state', case
          when exists (select 1 from public.note_corrections c where c.note_id = n.id and c.status = 'pending') then 'needsReview'
          when (select count(*) from public.note_accuracy_assessments a
            where a.note_id = n.id and a.assessment_revision = n.confirmation_epoch
              and a.answer = 'stillCorrect' and a.confirmation_source = 'direct'
              and a.verified_at >= now() - interval '3 months') >= 3 then 'communityConfirmed'
          else 'needsConfirmation' end,
        'priority', case when n.topic = 'shoreLeave' then 'P0'
          when n.topic in ('esim', 'physicalSim') then 'P1' else 'P2' end,
        'risk_signals', case when char_length(trim(f.body)) <= 12
          then jsonb_build_array('veryShort') else '[]'::jsonb end,
        'moderation_reason', f.moderation_reason
      ) as item
    from public.note_feedback f
    join public.port_notes n on n.id = f.note_id
    where f.status = p_status and f.deleted_at is null
      and (p_port_key is null or lower(n.port_key) = lower(trim(p_port_key)))
      and (p_topic is null or n.topic = p_topic)
      and (v_time is null or
        (p_sort = 'oldest' and (f.created_at, f.id) > (v_time, v_id)) or
        (p_sort = 'newest' and (f.created_at, f.id) < (v_time, v_id)))
  ), filtered as (
    select * from candidates where p_priority is null or priority = p_priority
  ), page as (
    select * from filtered
    order by
      case when p_sort = 'oldest' then created_at end asc,
      case when p_sort = 'oldest' then id end asc,
      case when p_sort = 'newest' then created_at end desc,
      case when p_sort = 'newest' then id end desc
    limit v_limit + 1
  )
  select coalesce(jsonb_agg(item order by
    case when p_sort = 'oldest' then created_at end asc,
    case when p_sort = 'oldest' then id end asc,
    case when p_sort = 'newest' then created_at end desc,
    case when p_sort = 'newest' then id end desc), '[]'::jsonb)
  into v_items from page;

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

create or replace function public.get_feedback_moderation_context(p_feedback_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_note public.port_notes;
  v_feedback jsonb;
begin
  if public.current_app_role() not in ('admin', 'moderator') then
    raise exception 'staff_required' using errcode = '42501';
  end if;
  select n.* into v_note
  from public.note_feedback selected
  join public.port_notes n on n.id = selected.note_id
  where selected.id = p_feedback_id and selected.deleted_at is null;
  if v_note.id is null then raise exception 'feedback_not_found' using errcode = 'P0002'; end if;

  select coalesce(jsonb_agg(public.note_feedback_json((f.*)::public.note_feedback) order by f.created_at desc, f.id desc), '[]'::jsonb)
  into v_feedback
  from (
    select item.* from public.note_feedback item
    where item.note_id = v_note.id and item.deleted_at is null
    order by case when item.id = p_feedback_id then 0 else 1 end,
      item.created_at desc, item.id desc
    limit 20
  ) f;
  return jsonb_build_object('note', public.note_json(v_note), 'feedback', v_feedback);
end;
$$;

create or replace function public.get_port_note(p_note_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_note public.port_notes;
begin
  select * into v_note from public.port_notes
  where id = p_note_id and (visibility = 'public' and moderation_state = 'approved'
    or public.current_app_role() in ('admin', 'moderator'));
  if v_note.id is null then raise exception 'note_not_found' using errcode = 'P0002'; end if;
  return public.note_json(v_note);
end;
$$;

revoke execute on function public.list_feedback_moderation_queue_v2(text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.get_feedback_moderation_context(uuid) from public, anon, authenticated;
revoke execute on function public.get_port_note(uuid) from public, anon, authenticated;
grant execute on function public.list_feedback_moderation_queue_v2(text, text, text, text, text, text, integer) to authenticated;
grant execute on function public.get_feedback_moderation_context(uuid) to authenticated;
grant execute on function public.get_port_note(uuid) to anon, authenticated;

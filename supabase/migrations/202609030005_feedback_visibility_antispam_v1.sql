alter table public.note_feedback
  add column if not exists normalized_body text;

update public.note_feedback
set normalized_body = lower(regexp_replace(trim(body), '[[:space:]]+', ' ', 'g'))
where normalized_body is null;

alter table public.note_feedback
  alter column normalized_body set not null,
  alter column status set default 'approved';

create index if not exists note_feedback_user_rate_limit
  on public.note_feedback (user_id, created_at desc);

create index if not exists note_feedback_user_note_duplicate
  on public.note_feedback (user_id, note_id, normalized_body, created_at desc);

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
      and (
        item.status = 'approved'
        or item.user_id = auth.uid()
        or public.current_app_role() in ('admin', 'moderator')
      )
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
declare
  v_feedback public.note_feedback;
  v_body text := trim(coalesce(p_body, ''));
  v_normalized_body text;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_idempotency_key is null then raise exception 'idempotency_key_required' using errcode = '22023'; end if;
  if char_length(v_body) not between 1 and 2000 then
    raise exception 'invalid_feedback' using errcode = '22023';
  end if;
  v_normalized_body := lower(regexp_replace(v_body, '[[:space:]]+', ' ', 'g'));

  perform pg_advisory_xact_lock(hashtextextended('feedback-submit:' || auth.uid()::text, 0));

  select * into v_feedback from public.note_feedback
  where user_id = auth.uid() and idempotency_key = p_idempotency_key;
  if v_feedback.id is not null then
    if v_feedback.note_id <> p_note_id or v_feedback.normalized_body <> v_normalized_body then
      raise exception 'feedback_idempotency_key_reused' using errcode = '22023';
    end if;
    return public.note_feedback_json(v_feedback);
  end if;

  if not exists (
    select 1 from public.port_notes
    where id = p_note_id and visibility = 'public' and moderation_state = 'approved'
  ) then raise exception 'note_not_available' using errcode = 'P0002'; end if;

  if exists (
    select 1 from public.note_feedback
    where user_id = auth.uid() and note_id = p_note_id
      and normalized_body = v_normalized_body
      and created_at > now() - interval '24 hours'
  ) then raise exception 'feedback_duplicate' using errcode = 'P0001'; end if;

  if exists (
    select 1 from public.note_feedback
    where user_id = auth.uid() and created_at > now() - interval '20 seconds'
  ) then raise exception 'feedback_cooldown' using errcode = 'P0001'; end if;

  select count(*) into v_count from public.note_feedback
  where user_id = auth.uid() and created_at > now() - interval '10 minutes';
  if v_count >= 5 then raise exception 'feedback_rate_limit_10m' using errcode = 'P0001'; end if;

  select count(*) into v_count from public.note_feedback
  where user_id = auth.uid() and created_at > now() - interval '60 minutes';
  if v_count >= 20 then raise exception 'feedback_rate_limit_60m' using errcode = 'P0001'; end if;

  insert into public.note_feedback (
    note_id, user_id, body, normalized_body, status, idempotency_key
  ) values (
    p_note_id, auth.uid(), v_body, v_normalized_body, 'approved', p_idempotency_key
  ) returning * into v_feedback;
  return public.note_feedback_json(v_feedback);
end;
$$;

create or replace function public.update_note_feedback(p_feedback_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feedback public.note_feedback;
  v_body text := trim(coalesce(p_body, ''));
  v_normalized_body text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if char_length(v_body) not between 1 and 2000 then
    raise exception 'invalid_feedback' using errcode = '22023';
  end if;
  v_normalized_body := lower(regexp_replace(v_body, '[[:space:]]+', ' ', 'g'));
  select * into v_feedback from public.note_feedback
    where id = p_feedback_id and user_id = auth.uid() and deleted_at is null for update;
  if v_feedback.id is null then raise exception 'feedback_not_found' using errcode = 'P0002'; end if;
  if exists (
    select 1 from public.note_feedback f
    where f.id <> p_feedback_id and f.user_id = auth.uid() and f.note_id = v_feedback.note_id
      and f.normalized_body = v_normalized_body
      and f.created_at > now() - interval '24 hours'
  ) then raise exception 'feedback_duplicate' using errcode = 'P0001'; end if;
  update public.note_feedback set body = v_body, normalized_body = v_normalized_body,
    status = case when v_feedback.status in ('pending', 'rejected') then 'pending' else 'approved' end,
    moderation_reason = null, moderated_by = null,
    moderated_at = null, updated_at = now()
    where id = p_feedback_id returning * into v_feedback;
  return public.note_feedback_json(v_feedback);
end;
$$;

comment on column public.note_feedback.normalized_body is
  'Server-normalized feedback body used only for same-user, same-note duplicate prevention.';

comment on function public.submit_note_feedback(uuid, text, uuid) is
  'Publishes normal feedback with per-user cooldown, rolling limits, duplicate detection and retry-safe idempotency.';

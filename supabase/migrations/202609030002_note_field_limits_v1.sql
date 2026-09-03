create or replace function public.port_note_detail_hard_limit(p_key text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case lower(regexp_replace(coalesce(p_key, ''), '^.*\.', ''))
    when 'price' then 80
    when 'fairprice' then 80
    when 'goodprice' then 80
    when 'cost' then 80
    when 'rideapp' then 80
    else 180
  end;
$$;

create or replace function public.submit_port_note(
  p_port_key text,
  p_context_key text,
  p_topic text,
  p_visibility text,
  p_takeaway text,
  p_details jsonb,
  p_contact text,
  p_contact_is_public_business boolean,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.port_notes;
  v_limit integer := 30;
  v_account_created_at timestamptz;
  v_detail record;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_visibility not in ('public', 'private') then
    raise exception 'invalid_visibility' using errcode = '22023';
  end if;
  if p_topic not in ('esim', 'physicalSim', 'shoreLeave', 'food', 'shopping', 'welfare', 'general') then
    raise exception 'invalid_topic' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_takeaway, ''))) not between 1 and 800 then
    raise exception 'invalid_takeaway' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_details, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_note_details' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_each(coalesce(p_details, '{}'::jsonb)) detail
    where jsonb_typeof(detail.value) <> 'string'
  ) then
    raise exception 'invalid_note_detail_value' using errcode = '22023';
  end if;
  for v_detail in
    select detail.key, detail.value #>> '{}' as value
    from jsonb_each(coalesce(p_details, '{}'::jsonb)) detail
  loop
    if char_length(trim(v_detail.value)) > public.port_note_detail_hard_limit(v_detail.key) then
      raise exception 'note_detail_too_long' using errcode = '22023';
    end if;
  end loop;
  if char_length(trim(coalesce(p_contact, ''))) > 180 then
    raise exception 'note_contact_too_long' using errcode = '22023';
  end if;
  select created_at into v_account_created_at from auth.users where id = auth.uid();
  if v_account_created_at > now() - interval '7 days' then
    v_limit := 5;
  end if;
  if (
    select count(*) from public.port_notes
    where author_id = auth.uid() and created_at >= current_date and visibility = 'public'
  ) >= v_limit then
    raise exception 'note_rate_limit' using errcode = '42501';
  end if;
  insert into public.port_notes (
    author_id, port_key, context_key, topic, visibility, moderation_state,
    summary, details, contact, contact_is_public_business, idempotency_key
  ) values (
    auth.uid(), p_port_key, p_context_key, p_topic, p_visibility,
    case when p_visibility = 'private' then 'notRequired' else 'pending' end,
    trim(p_takeaway), coalesce(p_details, '{}'::jsonb),
    case when p_visibility = 'private' or p_contact_is_public_business then nullif(trim(p_contact), '') else null end,
    case when p_visibility = 'public' then p_contact_is_public_business else false end,
    p_idempotency_key
  )
  on conflict (author_id, idempotency_key) do update
    set updated_at = public.port_notes.updated_at
  returning * into v_note;
  return public.note_json(v_note);
end;
$$;

revoke execute on function public.port_note_detail_hard_limit(text) from public, anon, authenticated;
revoke execute on function public.submit_port_note(text, text, text, text, text, jsonb, text, boolean, uuid) from public, anon, authenticated;
grant execute on function public.submit_port_note(text, text, text, text, text, jsonb, text, boolean, uuid) to authenticated;

comment on function public.port_note_detail_hard_limit(text) is
  'Server-side hard limits for new Port Note JSON detail values; existing rows remain unchanged.';

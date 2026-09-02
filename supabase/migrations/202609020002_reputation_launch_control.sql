create or replace function public.get_xp_system_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_launch_at timestamptz;
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  select launch_at into v_launch_at
  from public.xp_system_config
  where singleton;
  return jsonb_build_object('launch_at', v_launch_at);
end;
$$;

create or replace function public.launch_xp_system(p_launch_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.port_notes;
  v_existing_launch timestamptz;
  v_notes integer := 0;
  v_confirmed integer := 0;
  v_users integer := 0;
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_launch_at is null or p_launch_at > now() then
    raise exception 'invalid_launch_at' using errcode = '22023';
  end if;

  select launch_at into v_existing_launch
  from public.xp_system_config
  where singleton
  for update;

  if v_existing_launch is not null then
    return jsonb_build_object(
      'launch_at', v_existing_launch,
      'already_launched', true,
      'notes', 0,
      'community_confirmed', 0,
      'founding_contributors', 0
    );
  end if;

  update public.xp_system_config
  set launch_at = p_launch_at, launched_by = auth.uid(), updated_at = now()
  where singleton;

  for v_note in
    select n.* from public.port_notes n
    where n.author_id is not null
      and n.content_origin = 'user'
      and n.visibility = 'public'
      and n.moderation_state = 'approved'
      and n.created_at < p_launch_at
      and exists (
        select 1 from public.moderation_events m
        where m.note_id = n.id
          and m.next_state = 'approved'
          and m.created_at < p_launch_at
      )
  loop
    perform public.apply_xp_event(
      v_note.author_id, 'backfill_approved_note', 'note', v_note.id::text,
      public.xp_rule_amount('approved_note'), concat('approved-note:', v_note.id),
      auth.uid(), 'early_contribution', null, null,
      jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160), 'backfill', true)
    );
    v_notes := v_notes + 1;

    insert into public.user_achievements (user_id, achievement_key, earned_at, metadata)
    values (v_note.author_id, 'FOUNDING_CONTRIBUTOR', p_launch_at, jsonb_build_object('launch_at', p_launch_at))
    on conflict (user_id, achievement_key) do nothing;

    if (
      select count(*) from public.note_accuracy_assessments a
      where a.note_id = v_note.id
        and a.assessment_revision = v_note.confirmation_epoch
        and a.confirmation_source = 'direct'
        and a.verified_at >= p_launch_at - interval '3 months'
        and a.created_at < p_launch_at
    ) >= 3 then
      perform public.apply_xp_event(
        v_note.author_id, 'backfill_community_confirmed', 'note', v_note.id::text,
        public.xp_rule_amount('community_confirmed'), concat('community-confirmed:', v_note.id),
        auth.uid(), 'early_contribution', null, null,
        jsonb_build_object('port_key', v_note.port_key, 'summary', left(v_note.summary, 160), 'backfill', true)
      );
      v_confirmed := v_confirmed + 1;
    end if;
  end loop;

  select count(distinct user_id) into v_users
  from public.user_achievements
  where achievement_key = 'FOUNDING_CONTRIBUTOR' and revoked_at is null;

  return jsonb_build_object(
    'launch_at', p_launch_at,
    'already_launched', false,
    'notes', v_notes,
    'community_confirmed', v_confirmed,
    'founding_contributors', v_users
  );
end;
$$;

create or replace function public.launch_xp_system()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select public.launch_xp_system(clock_timestamp());
$$;

revoke execute on function public.get_xp_system_status() from public, anon;
revoke execute on function public.launch_xp_system() from public, anon;
grant execute on function public.get_xp_system_status() to authenticated;
grant execute on function public.launch_xp_system() to authenticated;

comment on function public.get_xp_system_status() is
  'Returns the one-time Reputation launch state to Admin only.';

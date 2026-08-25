create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'CrewPort Seafarer',
  nickname text,
  nickname_normalized text generated always as (lower(nickname)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) between 2 and 80),
  constraint profiles_nickname_format check (
    nickname is null or nickname ~ '^[a-z0-9_]{3,24}$'
  )
);

create unique index if not exists profiles_nickname_unique
  on public.profiles (nickname_normalized)
  where nickname_normalized is not null;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('member', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.port_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  port_key text not null,
  context_key text,
  topic text not null check (topic in (
    'esim', 'physicalSim', 'shoreLeave', 'food', 'shopping', 'welfare', 'general'
  )),
  visibility text not null check (visibility in ('public', 'private')),
  moderation_state text not null check (moderation_state in (
    'notRequired', 'pending', 'approved', 'rejected', 'quarantined'
  )),
  summary text not null check (char_length(summary) between 1 and 4000),
  details jsonb not null default '{}'::jsonb,
  contact text,
  contact_is_public_business boolean not null default false,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint port_notes_visibility_state check (
    (visibility = 'private' and moderation_state = 'notRequired') or
    (visibility = 'public' and moderation_state <> 'notRequired')
  ),
  constraint port_notes_contact_rule check (
    contact is null or visibility = 'private' or contact_is_public_business
  )
);

create unique index if not exists port_notes_author_idempotency
  on public.port_notes (author_id, idempotency_key);

create index if not exists port_notes_public_lookup
  on public.port_notes (port_key, context_key, topic, created_at desc, id desc)
  where visibility = 'public' and moderation_state = 'approved';

create index if not exists port_notes_moderation_queue
  on public.port_notes (moderation_state, created_at desc)
  where visibility = 'public';

create index if not exists port_notes_author_lookup
  on public.port_notes (author_id, created_at desc);

create table if not exists public.note_accuracy_assessments (
  note_id uuid not null references public.port_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer text not null check (answer in ('stillCorrect', 'changed', 'notSure')),
  assessment_revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (note_id, user_id, assessment_revision)
);

create unique index if not exists note_accuracy_current_answer
  on public.note_accuracy_assessments (note_id, user_id)
  where assessment_revision = 1;

create index if not exists note_accuracy_note_lookup
  on public.note_accuracy_assessments (note_id, answer);

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.port_notes(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  previous_state text not null,
  next_state text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists moderation_events_note_lookup
  on public.moderation_events (note_id, created_at desc);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_roles where user_id = auth.uid()),
    'member'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'CrewPort Seafarer'), 80)
  )
  on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.get_my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_user auth.users;
  v_profile public.profiles;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  select * into v_profile from public.profiles where user_id = v_user.id;
  return jsonb_build_object(
    'user_id', v_user.id,
    'email', coalesce(v_user.email, ''),
    'full_name', coalesce(v_profile.full_name, ''),
    'nickname', v_profile.nickname,
    'avatar_url', v_user.raw_user_meta_data ->> 'avatar_url',
    'role', public.current_app_role()
  );
end;
$$;

create or replace function public.update_my_profile(
  p_full_name text,
  p_nickname text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user auth.users;
  v_nickname text := nullif(lower(trim(p_nickname)), '');
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if char_length(trim(p_full_name)) not between 2 and 80 then
    raise exception 'invalid_full_name' using errcode = '22023';
  end if;
  if v_nickname is not null and v_nickname !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'invalid_nickname' using errcode = '22023';
  end if;
  if v_nickname in ('crewport', 'admin', 'moderator', 'support') then
    raise exception 'reserved_nickname' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.profiles
    where nickname_normalized = v_nickname and user_id <> auth.uid()
  ) then
    raise exception 'nickname_taken' using errcode = '23505';
  end if;
  update public.profiles
  set full_name = trim(p_full_name), nickname = v_nickname, updated_at = now()
  where user_id = auth.uid();
  return public.get_my_profile();
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
    'id', p_note.id::text,
    'port_key', p_note.port_key,
    'context_key', p_note.context_key,
    'topic', p_note.topic,
    'visibility', p_note.visibility,
    'moderation_state', p_note.moderation_state,
    'summary', p_note.summary,
    'details', p_note.details,
    'public_alias', coalesce((select nickname from public.profiles where user_id = p_note.author_id), ''),
    'contact', case when public.current_app_role() = 'admin' and p_note.contact_is_public_business then p_note.contact else null end,
    'contact_is_public_business', p_note.contact_is_public_business,
    'created_at', p_note.created_at,
    'author_id', case when auth.uid() = p_note.author_id or public.current_app_role() = 'admin' then p_note.author_id::text else null end,
    'accuracy', jsonb_build_object(
      'state', case
        when coalesce((select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id and a.answer = 'changed' and a.assessment_revision = 1), 0) > 0 then 'needsReview'
        when coalesce((select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id and a.answer = 'stillCorrect' and a.assessment_revision = 1), 0) >= 2 then 'communityConfirmed'
        else 'needsConfirmation'
      end,
      'still_correct', coalesce((select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id and a.answer = 'stillCorrect' and a.assessment_revision = 1), 0),
      'changed', coalesce((select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id and a.answer = 'changed' and a.assessment_revision = 1), 0),
      'not_sure', coalesce((select count(*) from public.note_accuracy_assessments a where a.note_id = p_note.id and a.answer = 'notSure' and a.assessment_revision = 1), 0),
      'viewer_answer', (select answer from public.note_accuracy_assessments a where a.note_id = p_note.id and a.user_id = auth.uid() and a.assessment_revision = 1)
    )
  );
$$;

create or replace function public.get_port_note_summary(
  p_port_key text,
  p_context_key text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with topics(topic) as (
    values ('esim'), ('physicalSim'), ('shoreLeave'), ('food'), ('shopping'), ('welfare'), ('general')
  )
  select jsonb_build_object(
    'community_count', (
      select count(*) from public.port_notes n
      where n.port_key = p_port_key
        and (p_context_key is null or n.context_key = p_context_key)
        and n.visibility = 'public' and n.moderation_state = 'approved'
    ),
    'topics', coalesce(jsonb_agg(jsonb_build_object(
      'topic', topics.topic,
      'approved_count', (
        select count(*) from public.port_notes n
        where n.port_key = p_port_key and (p_context_key is null or n.context_key = p_context_key)
          and n.topic = topics.topic and n.visibility = 'public' and n.moderation_state = 'approved'
      ),
      'pending_for_viewer_count', (
        select count(*) from public.port_notes n
        where n.port_key = p_port_key and (p_context_key is null or n.context_key = p_context_key)
          and n.topic = topics.topic and n.author_id = auth.uid()
          and ((n.visibility = 'public' and n.moderation_state = 'pending') or n.visibility = 'private')
      )
    )), '[]'::jsonb)
  )
  from topics;
$$;

create or replace function public.list_port_topic_notes(
  p_port_key text,
  p_context_key text,
  p_topic text,
  p_cursor text default null,
  p_limit integer default 3
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cursor_created_at timestamptz;
  v_cursor_id uuid;
  v_items jsonb;
  v_next_cursor text;
  v_last jsonb;
begin
  if p_cursor is not null then
    v_cursor_created_at := split_part(p_cursor, '|', 1)::timestamptz;
    v_cursor_id := split_part(p_cursor, '|', 2)::uuid;
  end if;
  with selected as (
    select n.*
    from public.port_notes n
    where n.port_key = p_port_key
      and (p_context_key is null or n.context_key = p_context_key)
      and n.topic = p_topic
      and n.visibility = 'public'
      and n.moderation_state = 'approved'
      and (v_cursor_created_at is null or (n.created_at, n.id) < (v_cursor_created_at, v_cursor_id))
    order by n.created_at desc, n.id desc
    limit greatest(1, least(p_limit, 20)) + 1
  )
  select coalesce(jsonb_agg(public.note_json((selected.*)::public.port_notes)), '[]'::jsonb)
  into v_items from selected;
  if jsonb_array_length(v_items) > greatest(1, least(p_limit, 20)) then
    v_last := v_items -> (jsonb_array_length(v_items) - 2);
    v_next_cursor := concat(v_last ->> 'created_at', '|', v_last ->> 'id');
    v_items := v_items - (jsonb_array_length(v_items) - 1);
  end if;
  return jsonb_build_object('items', v_items, 'next_cursor', v_next_cursor);
end;
$$;

create or replace function public.list_my_port_notes(
  p_port_key text,
  p_context_key text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(public.note_json(n) order by n.created_at desc), '[]'::jsonb)
  from public.port_notes n
  where n.author_id = auth.uid()
    and n.port_key = p_port_key
    and (p_context_key is null or n.context_key = p_context_key);
$$;

create or replace function public.list_all_my_port_notes()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(public.note_json(n) order by n.created_at desc), '[]'::jsonb)
  from public.port_notes n
  where n.author_id = auth.uid();
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
  if char_length(trim(p_takeaway)) not between 1 and 4000 then
    raise exception 'invalid_takeaway' using errcode = '22023';
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

create or replace function public.assess_port_note(
  p_note_id uuid,
  p_answer text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_answer not in ('stillCorrect', 'changed', 'notSure') then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;
  select author_id into v_author_id
  from public.port_notes
  where id = p_note_id and visibility = 'public' and moderation_state = 'approved';
  if v_author_id is null then
    raise exception 'note_not_available' using errcode = 'P0002';
  end if;
  if v_author_id = auth.uid() then
    raise exception 'self_assessment_not_allowed' using errcode = '42501';
  end if;
  insert into public.note_accuracy_assessments (note_id, user_id, answer, assessment_revision)
  values (p_note_id, auth.uid(), p_answer, 1)
  on conflict (note_id, user_id, assessment_revision)
  do update set answer = excluded.answer, updated_at = now();
end;
$$;

create or replace function public.list_moderation_queue(
  p_state text default null,
  p_port_key text default null,
  p_topic text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(public.note_json(n) order by n.created_at asc), '[]'::jsonb)
  from public.port_notes n
  where public.current_app_role() = 'admin'
    and n.visibility = 'public'
    and (p_state is null or n.moderation_state = p_state)
    and (p_port_key is null or n.port_key = p_port_key)
    and (p_topic is null or n.topic = p_topic);
$$;

create or replace function public.moderate_port_note(
  p_note_id uuid,
  p_next_state text,
  p_reason text,
  p_idempotency_key uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_state text;
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_next_state not in ('approved', 'rejected', 'quarantined') then
    raise exception 'invalid_moderation_state' using errcode = '22023';
  end if;
  if p_next_state in ('rejected', 'quarantined') and char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'moderation_reason_required' using errcode = '22023';
  end if;
  select moderation_state into v_previous_state from public.port_notes
  where id = p_note_id and visibility = 'public' for update;
  if v_previous_state is null then
    raise exception 'note_not_found' using errcode = 'P0002';
  end if;
  update public.port_notes
  set moderation_state = p_next_state, updated_at = now()
  where id = p_note_id;
  insert into public.moderation_events (note_id, actor_id, previous_state, next_state, reason)
  values (p_note_id, auth.uid(), v_previous_state, p_next_state, nullif(trim(p_reason), ''));
end;
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.port_notes enable row level security;
alter table public.note_accuracy_assessments enable row level security;
alter table public.moderation_events enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists port_notes_read_public_or_owner on public.port_notes;
create policy port_notes_read_public_or_owner on public.port_notes
  for select using (
    (visibility = 'public' and moderation_state = 'approved')
    or auth.uid() = author_id
    or (public.current_app_role() = 'admin' and visibility = 'public')
  );

drop policy if exists port_notes_insert_owner on public.port_notes;
create policy port_notes_insert_owner on public.port_notes
  for insert with check (
    auth.uid() = author_id
    and ((visibility = 'public' and moderation_state = 'pending')
      or (visibility = 'private' and moderation_state = 'notRequired'))
  );

drop policy if exists accuracy_owner_read on public.note_accuracy_assessments;
create policy accuracy_owner_read on public.note_accuracy_assessments
  for select using (auth.uid() = user_id);

drop policy if exists accuracy_owner_write on public.note_accuracy_assessments;
create policy accuracy_owner_write on public.note_accuracy_assessments
  for insert with check (auth.uid() = user_id);

drop policy if exists moderation_admin_read on public.moderation_events;
create policy moderation_admin_read on public.moderation_events
  for select using (public.current_app_role() = 'admin');

revoke all on public.profiles, public.user_roles, public.port_notes,
  public.note_accuracy_assessments, public.moderation_events from anon, authenticated;
grant execute on function public.get_port_note_summary(text, text) to anon, authenticated;
grant execute on function public.list_port_topic_notes(text, text, text, text, integer) to anon, authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;
grant execute on function public.list_my_port_notes(text, text) to authenticated;
grant execute on function public.list_all_my_port_notes() to authenticated;
grant execute on function public.submit_port_note(text, text, text, text, text, jsonb, text, boolean, uuid) to authenticated;
grant execute on function public.assess_port_note(uuid, text) to authenticated;
grant execute on function public.list_moderation_queue(text, text, text) to authenticated;
grant execute on function public.moderate_port_note(uuid, text, text, uuid) to authenticated;

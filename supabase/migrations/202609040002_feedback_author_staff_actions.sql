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
    where id = p_feedback_id and deleted_at is null
      and user_id = auth.uid()
    for update;
  if v_feedback.id is null then raise exception 'feedback_author_required' using errcode = '42501'; end if;
  if exists (
    select 1 from public.note_feedback f
    where f.id <> p_feedback_id and f.user_id = v_feedback.user_id and f.note_id = v_feedback.note_id
      and f.normalized_body = v_normalized_body
      and f.created_at > now() - interval '24 hours'
  ) then raise exception 'feedback_duplicate' using errcode = 'P0001'; end if;
  update public.note_feedback set body = v_body, normalized_body = v_normalized_body,
    status = case when v_feedback.status in ('pending', 'rejected') then 'pending' else 'approved' end,
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
  where id = p_feedback_id and deleted_at is null
    and (user_id = auth.uid() or public.current_app_role() in ('admin', 'moderator'));
  if not found then raise exception 'feedback_author_or_staff_required' using errcode = '42501'; end if;
end;
$$;

comment on function public.update_note_feedback(uuid, text) is
  'Allows only the feedback author to edit the body; Staff moderation remains a separate audited action.';

comment on function public.delete_note_feedback(uuid) is
  'Allows only the feedback author or Staff to soft-delete feedback.';

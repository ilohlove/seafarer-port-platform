create index if not exists note_accuracy_current_confirmation_idx
  on public.note_accuracy_assessments (note_id, assessment_revision, verified_at desc)
  where is_active and answer = 'stillCorrect' and confirmation_source = 'direct';

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
    'last_verified_at', (select max(a.verified_at) from public.note_accuracy_assessments a
      where a.note_id = p_note.id and a.assessment_revision = p_note.confirmation_epoch
        and a.is_active and a.answer = 'stillCorrect' and a.confirmation_source = 'direct'
        and a.verified_at >= now() - interval '3 months'),
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

comment on index public.note_accuracy_current_confirmation_idx is
  'Supports current three-month confirmation count and latest-verification projections.';

comment on function public.note_json(public.port_notes) is
  'Projects current confirmation trust; expired and revoked confirmations remain historical but are excluded.';

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
    'author_staff_title', (
      select case
        when role in ('admin', 'moderator') then role
        else null
      end
      from public.user_roles
      where user_id = p_note.author_id
    ),
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

comment on function public.note_json(public.port_notes) is
  'Returns the presentation-safe Port Note read model, including allowlisted public Staff identity.';

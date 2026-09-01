begin;

select plan(11);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'user_roles', 'user roles table exists');
select has_table('public', 'port_notes', 'port notes table exists');
select has_table('public', 'note_accuracy_assessments', 'accuracy table exists');
select has_table('public', 'moderation_events', 'moderation audit table exists');
select has_function('public', 'get_port_note_summary', 'summary RPC exists');
select has_function('public', 'submit_port_note', 'submission RPC exists');
select has_function('public', 'moderate_port_note', 'moderation RPC exists');
select has_function('public', 'note_json', 'note read-model function exists');
select ok(
  position('author_staff_title' in pg_get_functiondef('public.note_json(public.port_notes)'::regprocedure)) > 0,
  'note read model exposes a presentation-safe Staff title'
);
select ok(
  position('admin' in pg_get_functiondef('public.note_json(public.port_notes)'::regprocedure)) > 0
    and position('moderator' in pg_get_functiondef('public.note_json(public.port_notes)'::regprocedure)) > 0,
  'note read model allowlists Admin and Moderator Staff identities'
);

select * from finish();
rollback;

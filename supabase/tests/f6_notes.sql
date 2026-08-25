begin;

select plan(8);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'user_roles', 'user roles table exists');
select has_table('public', 'port_notes', 'port notes table exists');
select has_table('public', 'note_accuracy_assessments', 'accuracy table exists');
select has_table('public', 'moderation_events', 'moderation audit table exists');
select has_function('public', 'get_port_note_summary', 'summary RPC exists');
select has_function('public', 'submit_port_note', 'submission RPC exists');
select has_function('public', 'moderate_port_note', 'moderation RPC exists');

select * from finish();
rollback;

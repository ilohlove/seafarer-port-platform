# ADR-20260825 - Supabase Auth and Moderated Port Notes

Status: DRAFT
Owner: Architecture
Reviewers: Product, Community/Moderation, Security/Privacy, Backend/API, Data, Frontend, QA, DevOps
Last updated: 2026-08-25

## Context

CrewPort is moving the F6 contribution slice from a session-only prototype to a real authenticated flow. The product needs Google login, private profiles, moderated public notes, community accuracy assessments and an admin queue without turning Port Hub into a database entity.

## Decision

- Use Supabase Auth with Google as the only sign-in provider for this slice.
- Use Supabase Postgres, RLS and server-side RPCs for profiles, roles, port notes, assessments and moderation audit events.
- Keep the canonical port directory and Port Hub read model static; persist only user-generated and moderation data.
- Keep `/community` in an under-development state. Public notes are read through the selected port/context panel.
- Public notes start pending and require admin approval. Private notes are author-only and do not enter public aggregates.
- Public identity is a CrewPort nickname; Google email, full name and avatar metadata are private. Avatar display may use the Google image in Standard mode, with an initials fallback.
- Public note reads expose only approved notes. Pending and private records are returned only to their author or to the admin moderation queue when the record is public.
- Accuracy assessments are unique per user/note, with two independent positive assessments required for community confirmation. Changed reports flag a note for review and remove it from snapshot evidence without automatically deleting it.

## Consequences

- Production requires a Supabase project, Google OAuth credentials, callback allowlists and build-time public environment variables.
- RLS is the security boundary; route guards and hidden controls are only UX.
- Topic content can scale through indexed cursor pagination and per-port aggregates without loading a social feed.
- The application must retain a safe no-configuration state for local prototype and fork builds; it must never claim a successful login or saved note in that state.

## Alternatives considered

- Browser-only local persistence: rejected because public moderation, cross-device access and role enforcement require a server authority.
- Google profile name as public author: rejected because it exposes personal identity and conflicts with the anonymous/alias policy.
- A generic `/community` feed: deferred; it would increase scope and reduce port/context relevance.

## Validation

- Frontend unit and component tests cover session states, profile validation, topic pagination, note visibility and moderation UI.
- Supabase migration/RLS tests must pass in a disposable database before production credentials are enabled.
- Manual Google OAuth, callback, profile update and admin moderation smoke tests are required after the external Supabase project is configured.

## Related files

- `supabase/migrations/202608250001_f6_auth_notes.sql`
- `src/services/contracts/auth-repository.ts`
- `src/services/contracts/port-notes-repository.ts`

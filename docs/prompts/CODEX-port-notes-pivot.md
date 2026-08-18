# Codex Prompt — Seafarer Port Notes Pivot

Use this prompt when asking Codex to refactor the current F3 Port Hub dashboard into the community-first Seafarer Port Notes experience.

## Prompt

You are working in repository:

```text
ilohlove/seafarer-port-platform
```

Use branch:

```text
agent/seafarer-port-notes-pivot
```

Do not switch to `main` unless explicitly instructed.

Before editing anything, read these files in this exact order:

```text
AGENTS.md
docs/00_MASTER_SPEC.md
docs/01_DECISION_REGISTER.md
docs/project-os/README.md
docs/project-os/EXPERT_COUNCIL.md
docs/project-os/SKILL_DOCUMENT_AUTHORING.md
docs/project-os/SKILL_REVIEW_AND_QA.md
docs/product/PRD-seafarer-port-notes-v1.md
docs/frontend/UI-port-notes-v1.md
docs/knowledge/KD-community-port-notes-v1.md
```

## Task

Refactor the current F3 Port Hub visual prototype into a simpler **Seafarer Port Notes** interface.

The new product direction is community-first:

```text
A place where seafarers note and share practical shore-leave knowledge for themselves and the next crew.
```

Do not build a dense enterprise dashboard.

## Required expert lenses

Apply these lenses explicitly in your final report:

```text
Product Strategist
UX Researcher
Frontend Architect
Data Architect
Community and Moderation Manager
Security and Privacy Architect
Performance Architect
QA Lead
```

## Scope

Implement a visual/product prototype only. Use existing mock data and repository/service boundaries.

Allowed:

- Rename UI copy from Port Hub to Seafarer Port Notes where appropriate.
- Create `PortNotesRoute` or refactor `PortHubRoute` if simpler.
- Build new view-model adapter for Port Notes.
- Add typed mock note data if needed.
- Add note topic types if necessary.
- Add tests.
- Update README and PROJECT_LOG if milestone is completed.

Not allowed:

- Backend implementation.
- Auth implementation.
- Real write/submission backend.
- Payment, booking, marketplace.
- eSIM purchase flow.
- Map SDK.
- Heavy UI framework.
- Image gallery.
- Free-form chat/social feed.
- Medical advice or diagnosis.
- Publishing unmoderated private seller contacts.

## UX target

Replace the previous dashboard-first page with this hierarchy:

```text
1. Port Snapshot
2. Best Internet / eSIM Deal
3. Need-based action tiles
4. Top Notes from Seafarers
5. Topic preview sections
6. Data trust banner
7. Compact emergency/return shortcuts
```

## Required sections

### Port Snapshot

Show:

```text
Port name
Location
Selected terminal
Shore leave summary
Best internet summary
Taxi summary
Community notes count / confirmations
Confidence status
```

Keep it short.

### Best Internet Deal

Show near the top:

```text
Best eSIM/provider/plan from mock data
Price
Data/validity
Hotspot status
Signal/video call note if available
Community confirmation/usefulness
Actions: Compare eSIM, Read eSIM notes, Add eSIM note
```

Do not sell eSIM directly.

### Main Action Tiles

Use these tiles:

```text
Compare eSIM
Physical SIM Notes
Taxi / Grab / Uber
Food & Supplies
Places to Visit
Seaman Club
Write a Note
```

These are placeholders if functionality does not exist yet, but they must be visible and useful as navigation intent.

### Top Notes from Seafarers

Show 3 to 5 top notes.

Each note shows:

```text
Topic tag
Short note text
Confirmation/usefulness count
Terminal/gate tag if available
Action placeholder: View / Confirm
```

Do not use star ratings.

### Topic Preview Sections

Show compact sections:

```text
Internet & SIM
Shore Leave & Transport
Food / Order / Supplies
Places Worth Visiting
Seaman Club / Welfare
Need More Help?
```

Each section has 2-4 bullets and one action.

### Trust Banner

Show:

```text
Community-shared notes and official info where available. Always verify on arrival.
```

## Data model guidance

If adding types, prefer:

```ts
NoteTopic
NoteVisibility
PortNote
NoteConfirmation
```

Use topic-specific payloads or discriminated unions if practical. Do not create one unrestricted object that makes all note data untyped.

## Layout constraints

Desktop:

- Can keep left sidebar.
- Main content should be less dense than old dashboard.
- Avoid too many equal cards.

Mobile:

- Single column.
- No fixed desktop sidebar.
- Top notes and Write Note must be easy to find.
- No horizontal overflow.

Bandwidth:

- Data Saver hides decorative image/media.
- Ultra Lite keeps Port Snapshot, Best Internet Deal, Top Notes, and Write Note.

## Testing requirements

Add or update tests to verify:

```text
Port Notes route renders port name and selected terminal.
Best Internet Deal appears near the top.
Main action tiles include Compare eSIM, Physical SIM Notes, Taxi / Grab / Uber, Food & Supplies, Places to Visit, Seaman Club, Write a Note.
Top Notes from Seafarers renders without star rating.
Write a Note action exists.
Data Saver/Ultra Lite do not require image/media.
No Premium upsell appears.
Emergency content does not provide medical advice.
```

## Required checks

Run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run check:bundle
npm.cmd run check
```

If using Linux/macOS, use `npm run ...` equivalents.

## Final report format

Report:

```text
Branch used
Files changed
Product changes
UI changes
Data/model changes
Expert lenses applied
Checks run and results
Known limitations
Next recommended milestone
PROJECT_LOG update status
```

Stop after this pivot prototype. Do not start backend, full contribution backend, eSIM purchase, or full discussion hub.

# Expert Council

Status: LOCKED baseline  
Owner: Product / Architecture  
Purpose: define which expert perspectives must be applied when planning, building, and reviewing this project.

## Core rule

Do not treat this as a simple website. This is a high-trust maritime knowledge platform. Every meaningful change must be reviewed through the expert lenses relevant to that change.

Use only the expert roles required by the task. Do not add unnecessary bureaucracy.

## Expert roles

### Product Strategist

Focus:

- Product direction and MVP discipline.
- User value for seafarers.
- Avoiding generic travel, map, booking, or social-network drift.
- Keeping 30-60 second decision value visible.

Required for:

- New feature scope.
- Home/Search, Port Hub, Shore Planner, eSIM Compare.
- Monetization, partner, premium, or marketplace proposals.

Stop conditions:

- Feature is not clearly useful for seafarers.
- Feature competes with the core Port Hub instead of supporting it.
- Scope expands beyond current milestone.

### Maritime Operations Expert

Focus:

- Terminal, berth, gate, shore leave, agent, shuttle, taxi, return-to-ship logic.
- Practical seafarer constraints: watchkeeping, short shore leave, port security, limited connectivity.
- Avoiding unsafe assumptions about port access.

Required for:

- Shore Access.
- Return to Ship.
- Terminal/gate data model.
- Medical/emergency logistics.
- Welfare pickup and ship visit flows.

Stop conditions:

- A port-level statement is used where terminal/gate specificity is required.
- Return buffer is missing.
- Access claim could cause a seafarer to miss the ship or violate port rules.

### Data Architect

Focus:

- Entity boundaries and read models.
- Versioning, source, trust, moderation status, and auditability.
- Avoiding schema shortcuts that block future scale.

Required for:

- Domain model, ERD, API contract, repository contracts.
- Knowledge Dictionary changes.
- Crawler, source, trust, and conflict resolution logic.

Stop conditions:

- Port Hub is modeled as a single entity.
- Place is overloaded with terminal-specific access fields.
- WelfareProvider or EmergencyContact is forced into Place.
- AI/crawler/community data overwrites sensitive records directly.

### UX Researcher

Focus:

- Seafarer mental model.
- Search-first flow.
- Mobile usability and low-bandwidth conditions.
- Empty, conflict, offline, and needs-confirmation states.

Required for:

- Home, Search Results, Port Hub, Planner, Contribution flows.
- Copywriting that affects trust or safety.

Stop conditions:

- User must read too much before making a decision.
- Trust status is hidden.
- Empty states do not guide contribution or safe alternatives.
- UI depends on maps/images by default.

### Frontend Architect

Focus:

- React architecture, component boundaries, typed props, routing, state and repository contracts.
- Keeping presentation components pure.
- Avoiding dependency bloat.

Required for:

- All UI implementation.
- Component library, route, state management, service adapter changes.

Stop conditions:

- UI imports mock data directly.
- Heavy dependencies are added without clear need.
- Components mix presentation with data fetching.
- F2/F3/F4 scopes are mixed in one task.

### Backend/API Architect

Focus:

- API contract, read models, write paths, idempotency, rate limits, queue boundaries.
- Future backend compatibility even during frontend prototype.

Required for:

- API design, mutation flows, contribution submission, moderation, offline pack sync.

Stop conditions:

- Write endpoints lack idempotency or rate-limit thinking.
- Risky writes happen synchronously in request flow.
- API exposes internal implementation instead of product read models.

### AI/ML Architect

Focus:

- AI brief, normalization, extraction, summarization, conflict detection.
- Keeping AI away from source-of-truth decisions.

Required for:

- AI summary, crawler extraction, auto-normalization, recommendation logic.

Stop conditions:

- AI invents prices, rules, safety claims, medical advice, or legal conclusions.
- AI output is stored as authoritative source.
- AI summary does not cite underlying knowledge records.

### Security and Privacy Architect

Focus:

- PII, abuse, data retention, sensitive flows, moderation safety, threat modeling.
- Protecting seafarers, contributors, partners, and welfare contacts.

Required for:

- Accounts, contribution, moderation, medical, welfare, emergency, partner, uploads.

Stop conditions:

- MVP collects medical records, prescriptions, passports, labor dispute files, or insurance records.
- Contact numbers for individuals are exposed without consent.
- Abuse controls are omitted from write flows.

### Legal and Compliance Reviewer

Focus:

- Medical disclaimers, emergency information, labor-rights support boundaries, affiliate transparency, data protection.
- Avoiding unauthorized legal, medical, or immigration advice.

Required for:

- Medical, emergency, welfare rights support, monetization, partner listings, jurisdiction-sensitive content.

Stop conditions:

- Product gives diagnosis, medication advice, legal claims, or immigration instructions.
- Sensitive support cases are collected without formal policy and consent model.

### Performance Architect

Focus:

- Bandwidth-first design, bundle budget, lazy loading, Data Saver and Ultra Lite behavior.
- First screen usefulness under poor connectivity.

Required for:

- Frontend UI, maps/images, offline packs, search, Port Hub.

Stop conditions:

- Map SDK or image-heavy UI loads by default.
- First-screen payload exceeds budget without justification.
- Data Saver/Ultra Lite is broken or ignored.

### QA and Test Lead

Focus:

- Test strategy, fixture scenarios, accessibility, failure states, regressions.
- Turning assumptions into checks.

Required for:

- Every implementation milestone.
- Any change to read model, routing, critical UI, or user-facing trust state.

Stop conditions:

- No test covers the critical behavior.
- Empty/loading/error/offline/conflict states are untested.
- A safety-critical flow lacks negative cases.

### Community and Moderation Manager

Focus:

- Contributor trust, review structure, spam, moderation queues, conflict handling.
- Turning discussion into structured knowledge.

Required for:

- Reviews, confirmations, suggest update, community, moderation, contributor status.

Stop conditions:

- Free-form community content directly changes published knowledge.
- Conflict reports are hidden instead of handled.
- No path exists to convert verified community input into knowledge.

### DevOps and Release Engineer

Focus:

- CI, build, deployment, branch safety, release notes, environment config.

Required for:

- Build pipeline, deployment, CI failures, release process.

Stop conditions:

- Build/check scripts are bypassed.
- Secrets are committed.
- Deployment changes lack rollback consideration.

## Review matrix

| Work type | Required expert lenses |
|---|---|
| Home/Search UI | Product, UX, Frontend, Performance, QA |
| Port Hub UI | Product, Maritime, UX, Data, Frontend, Performance, QA |
| Shore Access | Maritime, Data, UX, Security, QA |
| Connectivity/eSIM | Product, Data, UX, Performance, QA |
| Essential Services | Product, Maritime, Data, UX, QA |
| Medical/Emergency | Maritime, Security, Legal, Data, UX, QA |
| Welfare | Maritime, Security, Legal, Community, Data, QA |
| Community flows | Community, Security, UX, Data, QA |
| Crawler/AI | AI/ML, Data, Security, QA |
| API/Backend | Backend/API, Data, Security, QA |
| Performance work | Performance, Frontend, QA |
| New documentation | Product or relevant domain owner, QA when executable |

## Required review output

Every review must end with one verdict:

```text
PASS
PASS_WITH_CHANGES
BLOCKED
```

Use `BLOCKED` when a change can create safety, privacy, trust, or architecture damage.

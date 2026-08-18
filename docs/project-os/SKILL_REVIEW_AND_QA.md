# Project Skill: Review and QA

Status: LOCKED baseline  
Owner: QA Lead  
Use when: reviewing specifications, UI, code, data models, prompts, documentation, or release readiness.

## Purpose

This project skill defines how to review work in a high-trust maritime platform. Reviews must catch issues that affect seafarer safety, money, time, privacy, data trust, bandwidth, or product focus.

## Review verdicts

Use exactly one verdict:

```text
PASS
PASS_WITH_CHANGES
BLOCKED
```

Meaning:

- `PASS`: no required changes.
- `PASS_WITH_CHANGES`: acceptable after listed changes are applied.
- `BLOCKED`: do not merge or continue until critical issues are resolved.

## Required review structure

Every review report must include:

```markdown
# Review Report - <Scope>

Status: REVIEW  
Owner: QA Lead  
Reviewers: <expert roles>  
Last updated: YYYY-MM-DD

## Verdict

PASS | PASS_WITH_CHANGES | BLOCKED

## Scope reviewed

## Files reviewed

## Critical issues

## Required changes

## Suggested changes

## Checks run

## Remaining risks
```

Save reusable review reports in:

```text
docs/qa/REVIEW-REPORT-<scope>-YYYYMMDD.md
```

## Universal review checklist

Apply to all meaningful changes:

- Scope matches the current milestone.
- No locked decision is contradicted.
- No generic travel, map, booking, or social feature creep is introduced.
- Trust status remains visible for safety, money, access, medical, welfare, or return-to-ship claims.
- Data Saver and Ultra Lite assumptions are preserved.
- Terminal/gate scope is used where port-level claims are unsafe.
- Empty, loading, error, offline, and conflict states are considered.
- Tests or documented checks cover the key behavior.
- `PROJECT_LOG.md` is updated only for a meaningful milestone.

## Product review checklist

- Does the change help a seafarer decide faster?
- Can the value be understood in 30-60 seconds?
- Is the MVP still narrow?
- Does the feature support Port Hub rather than distracting from it?
- Are out-of-scope features explicitly avoided?

Block if:

- The change turns the product into generic travel search, Google Maps clone, TripAdvisor, Facebook, Booking, or marketplace too early.

## Maritime logic checklist

- Is the information terminal/gate-specific when required?
- Is return-to-ship buffer considered?
- Are shore leave, documents, shuttle, taxi pickup, walking, and return procedure handled cautiously?
- Does the UI avoid implying permission to go ashore when data is uncertain?
- Does the model support agent/master/port-security confirmation?

Block if:

- A user could miss the ship, violate port rules, or enter restricted areas because of the change.

## Data architecture checklist

- Are entities correctly separated?
- Is Port Hub treated as a read model, not a storage entity?
- Is `Place` not overloaded with terminal-specific access facts?
- Are `EmergencyContact` and `WelfareProvider` separate from `Place`?
- Are source, trust, moderation status, and versioning preserved?
- Are AI/crawler/community inputs prevented from direct overwrite of sensitive facts?

Block if:

- The schema hides source/trust history or collapses distinct domains into one vague object.

## UX review checklist

- Is search primary?
- Is the first screen useful without map or images?
- Is the information scannable on mobile?
- Are labels plain and action-oriented?
- Are no-data states helpful?
- Are conflict and uncertainty states honest?
- Are actions limited to what the milestone supports?

Block if:

- Critical information is hidden behind heavy UI, images, maps, or long text.

## Frontend review checklist

- Presentation components receive typed props and do not import data/mock or services directly.
- Service/repository boundaries remain intact.
- No heavy dependencies are added without explicit justification.
- Route and milestone boundaries remain clear.
- Components work in Standard, Data Saver, and Ultra Lite modes.
- Code is accessible and keyboard-operable.

Required checks when code changes:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run check:bundle
npm.cmd run check
```

Use non-Windows equivalents only when the environment is not Windows.

## Security and privacy checklist

- No secrets, tokens, passwords, API keys, or sensitive personal data are committed.
- No medical records, prescriptions, passports, insurance records, labor dispute files, or identity documents are collected in MVP.
- Individual volunteer contact numbers are not exposed without consent.
- Write flows have anti-abuse, moderation, rate-limit, or future hooks.
- Sensitive reports are quarantined instead of published directly.

Block if:

- The change creates privacy risk, unsafe uploads, or public exposure of sensitive individual data.

## Medical, emergency, and welfare checklist

- Emergency contact is official or clearly marked uncertain.
- Medical content is logistics only, not diagnosis or treatment.
- Pharmacy data does not imply drug availability or dosage advice.
- Welfare rights support points to verified contacts and does not collect case files in MVP.
- Emergency Mode remains simple, offline-capable, and free from ads or distraction.

Block if:

- The system gives medical/legal advice, stores sensitive case documents, or lets unverified reports override emergency data.

## Performance checklist

- No map SDK, image gallery, chart library, video, custom font, or heavy client library loads on first screen by default.
- First-screen budget remains within the configured bundle gate.
- Optional content is lazy-loaded.
- Data Saver/Ultra Lite does not load decorative images.

Block if:

- A default screen becomes heavy enough to fail low-bandwidth maritime use.

## Accessibility checklist

- Controls have accessible names.
- Keyboard operation works.
- Status updates use appropriate live regions when needed.
- Color is not the only way to communicate trust, warning, or status.
- Headings and landmarks are structured.

Block if:

- Critical actions or warnings are inaccessible to keyboard or screen-reader users.

## Test scenario checklist

At minimum, keep scenarios for:

- Trusted/full data port.
- Needs-confirmation port.
- Conflicting-reports port.
- No-data category.
- Terminal-specific access difference.
- Emergency contact official source.
- Welfare provider without physical place.
- Offline/Data Saver/Ultra Lite.

## Review completion format

End every review with:

```text
Verdict: <PASS | PASS_WITH_CHANGES | BLOCKED>
Required before merge:
- <item or None>
Suggested next:
- <item or None>
Checks:
- <command>: <pass/fail/not run>
```

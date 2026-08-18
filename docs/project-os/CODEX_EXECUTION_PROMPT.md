# Codex Execution Prompt

Status: LOCKED baseline  
Owner: Product / Architecture  
Use when: giving Codex a repo task so it reads the correct project rules before editing.

## Master prompt for any Codex task

Copy this prompt into Codex and then append the specific task below it.

```text
You are working in repository:
ilohlove/seafarer-port-platform

Before editing anything, read these files in this exact order:

1. AGENTS.md
2. docs/00_MASTER_SPEC.md
3. docs/01_DECISION_REGISTER.md
4. docs/project-os/README.md
5. docs/project-os/EXPERT_COUNCIL.md
6. docs/project-os/SKILL_DOCUMENT_AUTHORING.md
7. docs/project-os/SKILL_REVIEW_AND_QA.md

Then read the milestone/task-specific file named by the task.

Operating rules:

- Do not modify main directly.
- Work on the requested branch or create agent/<short-kebab-description>.
- Do not add dependencies unless the task explicitly requires it and you explain the bundle impact.
- Do not implement future milestones accidentally.
- Do not create new markdown files outside the approved paths in SKILL_DOCUMENT_AUTHORING.md.
- Do not create generic docs such as notes.md, plan.md, final.md, review.md, or temp.md.
- If creating documentation, use the required template and status field.
- If reviewing work, use SKILL_REVIEW_AND_QA.md and end with PASS, PASS_WITH_CHANGES, or BLOCKED.
- Preserve Search First, Decision First, Trust First, Bandwidth First.
- Keep maps, images, AI summaries, and heavy UI opt-in.
- Treat Port Hub as a read model, not a storage entity.
- Use terminal/gate-specific scope where needed.
- Keep EmergencyContact and WelfareProvider separate from Place.
- Do not collect medical records, prescriptions, passports, insurance records, labor dispute files, or sensitive case documents in MVP.

Before coding:

1. Classify the task type.
2. Identify required expert lenses from EXPERT_COUNCIL.md.
3. State scope and out-of-scope.
4. List files you expect to edit.
5. Stop if the task conflicts with a LOCKED decision.

After coding:

Run the relevant checks. For Windows, prefer:

npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run check:bundle
npm.cmd run check

If the environment is not Windows, use the equivalent npm commands.

When finished, report:

- Branch used.
- Files changed.
- Expert lenses applied.
- Checks run and results.
- Any remaining risks.
- Whether PROJECT_LOG.md was updated and why.
```

## Prompt for validating PR #1 and this operating system branch

Use this when PR #1 and the project operating docs have not yet been merged.

```text
You are working in repository:
ilohlove/seafarer-port-platform

Checkout the latest branch:
agent/project-operating-system

This branch is based on:
agent/f1-5-domain-alignment

Do not use main unless the related PRs have already been merged.

First read:
- AGENTS.md
- docs/00_MASTER_SPEC.md
- docs/01_DECISION_REGISTER.md
- docs/project-os/README.md
- docs/project-os/EXPERT_COUNCIL.md
- docs/project-os/SKILL_DOCUMENT_AUTHORING.md
- docs/project-os/SKILL_REVIEW_AND_QA.md

Task:
Validate that F1.5 Domain Alignment and Project Operating System documentation are consistent and buildable.

Scope:
- Run checks.
- Fix only type, lint, test, formatting, import, or documentation consistency issues caused by these branches.
- Do not implement F2 Home/Search.
- Do not implement F3 Port Hub.
- Do not add dependencies.
- Do not redesign UI.

Required checks:
- npm.cmd run lint
- npm.cmd run typecheck
- npm.cmd run test
- npm.cmd run build
- npm.cmd run check:bundle
- npm.cmd run check

If all checks pass, summarize readiness to merge.
If checks fail, fix the smallest safe issue and rerun the relevant check.
```

## Prompt for F2 Home/Search after validation passes

Use only after F1.5 and project-os docs are validated.

```text
You are working in repository:
ilohlove/seafarer-port-platform

Create or use branch:
agent/f2-home-search

Before editing anything, read:
- AGENTS.md
- docs/00_MASTER_SPEC.md
- docs/01_DECISION_REGISTER.md
- docs/02_FRONTEND_PROTOTYPE_PROMPT.md
- docs/project-os/README.md
- docs/project-os/EXPERT_COUNCIL.md
- docs/project-os/SKILL_REVIEW_AND_QA.md

Task:
Implement F2 Home/Search Results only.

Required expert lenses:
- Product Strategist
- UX Researcher
- Frontend Architect
- Performance Architect
- QA Lead

Scope:
- Create true Search First Home at `/`.
- Create Search Results route.
- Remove Singapore as the default user-facing query.
- Add recent/continue/favorite placeholders where appropriate.
- Add no-result state with suggest-port action placeholder.
- Keep Foundation preview only if useful as an internal/component route, not as the main Home.
- Preserve Data Saver and Ultra Lite.
- Do not implement Port Hub F3.
- Do not add map SDK, image gallery, custom font, or heavy UI framework.

Acceptance criteria:
- First screen is useful without images or maps.
- Search box is primary.
- Results show port, country, city, UN/LOCODE, terminal context, and trust status.
- Empty/loading/error/offline states are present.
- Tests cover search submit, empty result, trust labels, and bandwidth mode.
- Bundle gate still passes.

Run all checks before final report.
```

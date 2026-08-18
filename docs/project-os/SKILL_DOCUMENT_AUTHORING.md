# Project Skill: Document Authoring

Status: LOCKED baseline  
Owner: Product / Documentation  
Use when: creating, renaming, editing, or organizing any repository documentation.

## Purpose

This project skill prevents documentation sprawl. It defines where each new `.md` file must be created, how it must be named, and what minimum sections it must contain.

Do not create new markdown files outside these rules unless the user explicitly overrides the convention.

## Before creating a new document

1. Read `AGENTS.md`.
2. Read `docs/project-os/README.md`.
3. Search existing docs for the same topic.
4. Decide whether to update an existing document instead of creating a new one.
5. Choose the path from the registry below.
6. Use the required template.
7. Update `PROJECT_LOG.md` only if the new document represents a meaningful project milestone.

## Approved documentation paths

Only create new documentation in these locations unless explicitly instructed.

```text
docs/
  00_MASTER_SPEC.md
  01_DECISION_REGISTER.md
  02_FRONTEND_PROTOTYPE_PROMPT.md
  project-os/
    README.md
    EXPERT_COUNCIL.md
    SKILL_DOCUMENT_AUTHORING.md
    SKILL_REVIEW_AND_QA.md
    CODEX_EXECUTION_PROMPT.md
  product/
    PRD-<feature>-v<major>.md
    FLOW-<feature>-v<major>.md
    COPY-<screen-or-flow>-v<major>.md
  knowledge/
    KD-<domain>-v<major>.md
    KD-<domain>-CHANGELOG.md
  architecture/
    ADR-YYYYMMDD-<short-decision>.md
    ERD-<domain>-v<major>.md
    API-<domain>-v<major>.md
    DATA-STANDARD-<domain>-v<major>.md
  frontend/
    UI-<screen>-v<major>.md
    COMPONENT-<component-or-system>-v<major>.md
    ROUTE-<flow>-v<major>.md
  qa/
    TEST-PLAN-<scope>-v<major>.md
    REVIEW-REPORT-<scope>-YYYYMMDD.md
  prompts/
    CODEX-<milestone>-<short-task>.md
```

Root-level markdown is restricted to:

```text
README.md
AGENTS.md
PROJECT_LOG.md
```

Do not create random files such as:

```text
notes.md
plan.md
new-plan.md
review.md
spec2.md
final.md
```

## Naming rules

Use ASCII filenames. Use uppercase document type prefixes and kebab-case slugs.

Examples:

```text
docs/product/PRD-port-hub-v1.md
docs/product/FLOW-shore-planner-v1.md
docs/knowledge/KD-shore-access-v1.md
docs/architecture/ADR-20260818-terminal-place-access.md
docs/frontend/UI-home-search-v1.md
docs/qa/TEST-PLAN-f2-home-search-v1.md
docs/prompts/CODEX-F2-home-search.md
```

Rules:

- Use `v1`, `v2`, etc. for major versions.
- Use `YYYYMMDD` for dated review reports and ADRs.
- Do not include spaces, Vietnamese diacritics, or punctuation in filenames.
- Do not create duplicate documents with similar names.
- If a document is superseded, mark it `ARCHIVED` inside the document instead of deleting it.

## Document status values

Use exactly one:

```text
DRAFT
REVIEW
LOCKED
ARCHIVED
```

Meaning:

- `DRAFT`: working proposal, not binding.
- `REVIEW`: ready for expert review.
- `LOCKED`: approved baseline. Future changes require explicit update.
- `ARCHIVED`: kept for history, no longer authoritative.

## Standard document template

Use this template unless a specialized template below is more appropriate.

```markdown
# <Document Title>

Status: DRAFT  
Owner: <role or team>  
Reviewers: <expert roles>  
Last updated: YYYY-MM-DD

## Purpose

<Why this document exists.>

## Scope

<What this document covers.>

## Out of scope

<What this document intentionally does not cover.>

## Decisions or rules

<The actual substance.>

## Open questions

- <Question or None.>

## Related files

- <path>
```

## PRD template

Use for product feature specs.

```markdown
# PRD - <Feature>

Status: DRAFT  
Owner: Product Strategist  
Reviewers: UX Researcher, Maritime Operations Expert, Data Architect, QA Lead  
Last updated: YYYY-MM-DD

## Problem

## Target users

## User value

## MVP scope

## Out of scope

## User flows

## Data dependencies

## Trust and safety requirements

## Bandwidth requirements

## Acceptance criteria

## Open questions
```

## Knowledge Dictionary template

Use for domain knowledge standards.

```markdown
# Knowledge Dictionary - <Domain>

Status: DRAFT  
Owner: Data Architect  
Reviewers: Maritime Operations Expert, Product Strategist, Security/Privacy Architect, QA Lead  
Last updated: YYYY-MM-DD

## Domain purpose

## User questions answered

## Knowledge items

## Entity and scope rules

## Trust statuses

## Source policy

## Moderation policy

## Update frequency

## UI display rules

## Risks if wrong

## Acceptance criteria
```

## ADR template

Use for architecture decisions.

```markdown
# ADR-YYYYMMDD - <Decision>

Status: DRAFT  
Owner: Architecture  
Reviewers: Data Architect, Frontend Architect, Backend/API Architect, QA Lead  
Last updated: YYYY-MM-DD

## Context

## Decision

## Consequences

## Alternatives considered

## Validation

## Related files
```

## Review report template

Use only under `docs/qa/`.

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

## When to update instead of create

Update an existing document when:

- The topic already exists.
- The change is a refinement, not a new domain or decision.
- The filename would differ only by wording.
- The document is still DRAFT or REVIEW.

Create a new document when:

- It is a new feature, domain, ADR, milestone prompt, or review report.
- The prior version is LOCKED and the change is a major version.
- The document type has a different lifecycle.

## Anti-sprawl rules

- Do not create meeting notes unless requested.
- Do not create separate mini-docs for small code changes.
- Do not split one feature into many docs before the first PRD is approved.
- Do not create docs that duplicate `00_MASTER_SPEC.md` or `01_DECISION_REGISTER.md`.
- Do not create a prompt file unless the prompt is intended to be reused.

## Required final note after creating docs

When a task creates or updates documentation, summarize:

```text
Created/updated files:
- <path>: <purpose>

Status:
- <DRAFT/REVIEW/LOCKED>

Next required review:
- <expert roles or None>
```

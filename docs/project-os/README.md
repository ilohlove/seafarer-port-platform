# Project Operating System

Status: LOCKED baseline for agent coordination  
Owner: Product / Architecture  
Applies to: all Codex, ChatGPT, and human contributors working in this repository

## Purpose

This directory defines how the Seafarer Port Knowledge Platform is coordinated as a large-scale product for a potentially global seafarer audience. It does not replace the product spec. It tells contributors how to read the spec, which expert perspectives must be applied, where new documents must be created, and how work must be reviewed before it is considered complete.

The project goal remains: help seafarers understand a port in 30-60 seconds, with terminal/gate-aware, trust-aware, bandwidth-first knowledge.

## Authority order

When instructions conflict, use this order:

1. Latest explicit user instruction in the current task.
2. `AGENTS.md`.
3. `docs/01_DECISION_REGISTER.md` locked decisions.
4. `docs/00_MASTER_SPEC.md`.
5. `docs/project-os/*` operating rules.
6. Milestone prompt such as `docs/02_FRONTEND_PROTOTYPE_PROMPT.md`.
7. Existing implementation.

If a requested change conflicts with a locked decision, do not silently implement it. State the conflict and propose the smallest safe path.

## Required reading before any non-trivial task

Read these files first:

1. `AGENTS.md`
2. `docs/00_MASTER_SPEC.md`
3. `docs/01_DECISION_REGISTER.md`
4. `docs/project-os/README.md`

Then read task-specific files:

- For expert roles and review ownership: `docs/project-os/EXPERT_COUNCIL.md`
- For creating or editing documentation: `docs/project-os/SKILL_DOCUMENT_AUTHORING.md`
- For review, QA, test planning, or release gates: `docs/project-os/SKILL_REVIEW_AND_QA.md`
- For Codex execution prompts: `docs/project-os/CODEX_EXECUTION_PROMPT.md`

## Operating principles

1. Keep the product Search First, Decision First, Trust First, and Bandwidth First.
2. Do not build generic travel, map, social, or booking features unless the spec explicitly allows it.
3. Do not treat Port Hub as one database entity. Treat it as a read model assembled from port, terminal, gate, knowledge, service, community, trust, and source data.
4. Prefer terminal/gate-specific data over port-level assumptions.
5. Keep maps, images, charts, AI summaries, and heavy interactions opt-in.
6. Never let crawler, AI, or community reports overwrite sensitive facts directly.
7. Do not collect medical records, prescriptions, labor dispute files, passports, or other sensitive documents in MVP.
8. Every user-facing claim that can affect safety, money, access, or return-to-ship must expose trust status.
9. Each milestone must stop for review before expanding scope.
10. New documents must follow the path and naming rules in `SKILL_DOCUMENT_AUTHORING.md`.

## Expert coordination model

Use the expert council in `EXPERT_COUNCIL.md`. Do not ask all experts to review every task. Select the minimum expert set required by the work type.

Typical mapping:

- UI or flow: Product Strategist, UX Researcher, Frontend Architect, Performance Architect, QA Lead.
- Domain data model: Maritime Operations Expert, Data Architect, Security/Privacy Architect, QA Lead.
- Medical, welfare, or emergency: Maritime Operations Expert, Security/Privacy Architect, Legal/Compliance Reviewer, QA Lead.
- Community/review/moderation: Community Manager, Security/Privacy Architect, Data Architect, QA Lead.
- AI/crawler: AI/ML Architect, Data Architect, Security/Privacy Architect, QA Lead.

## Task lifecycle

For each meaningful task:

1. Classify the task type.
2. Read the required docs.
3. Identify applicable experts.
4. Define scope and out-of-scope items.
5. Implement the smallest coherent change.
6. Run relevant checks.
7. Review against `SKILL_REVIEW_AND_QA.md`.
8. Update `PROJECT_LOG.md` only if the work completed a meaningful milestone.
9. Summarize what changed, what was validated, and what remains.

## Branching policy

Default branch work must not be modified directly by agents unless explicitly instructed. Prefer a branch:

```text
agent/<short-kebab-description>
```

Use draft pull requests for incomplete or review-needed work.

## Milestone discipline

Current expected sequence:

1. F1.5 Domain Alignment.
2. F2 Home/Search Results.
3. F3 Port Hub.
4. F4 Shore Planner.
5. F5 Multi-port eSIM Compare.
6. F6 Contribution and confirmation flows.
7. F7 Quality gate.

Do not jump to later UI flows before their dependencies are stable.

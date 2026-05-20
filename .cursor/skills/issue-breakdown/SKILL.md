---
name: issue-breakdown
description: Break a Linear issue into small, well-scoped sub-issues suitable for a junior developer, each with task definition, acceptance criteria, TDD plan, and Q&C checkboxes for expert review.
---

Given a Linear issue ID (e.g. `ETD-3`):

1. **Fetch the issue** via `mcp__linear-server__get_issue`
2. **Gather context** — read relevant code, schema, or migrations in the repo to inform the breakdown
3. **Post a Q&C comment** on the main issue with a `## Questions & Considerations` section; all open questions use `[ ]` checkbox options so reviewers can answer quickly
4. **Break into sub-issues** — create each with `mcp__linear-server__save_issue` using `parentId` set to the main issue's identifier

### Each sub-issue must contain

#### ## Task
One paragraph describing exactly what to do. Specific enough that a junior developer can start without asking questions.

#### ## Acceptance Criteria
Checkboxed list (`- [ ]`) of concrete, verifiable outcomes.

#### ## TDD Plan
Tests to write **before** implementation. Keep it minimal — only confirm core functionality:
- List the test cases (e.g., unit, integration, or SQL assertion)
- Note the test file path and framework if inferable from the repo
- If testing doesn't apply (e.g., pure data seed with no logic), state why and skip

#### ## Questions & Considerations
All open questions as `[ ]` checkbox options so an expert reviewer can answer inline.

### Sub-issue rules
- Scoped for **one junior developer**, completable in 1–2 days
- Ordered by **dependency** — foundation/reference data or prerequisite steps first
- Set `parentId` to the parent issue identifier
- Use the same team as the parent issue

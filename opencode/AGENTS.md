# Working Agreement

- Inspect the relevant code and configuration before making assumptions.
- When implementation is requested, act instead of only proposing a solution.
- Prefer the smallest correct change and carry it through verification.
- Preserve unrelated work and never use destructive commands without explicit approval.
- When work is complete on a non-default branch, commit and push only the task's changes. On `main`, `master`, or another default branch, ask before committing or pushing.
- Ask only when a consequential choice cannot be inferred or safely reversed.
- Use current documentation for libraries, APIs, and tools.
- Keep status updates and final reports concise and factual.

## Programming

### Systems Design

Apply this gate to live or pinned interfaces, lifecycle or cross-boundary behavior, canonical state, destructive or authorization-sensitive mutation, distributed atomicity, irreversible migration, or high-blast-radius control.

Before implementation or mutation, write a compact working record: behavioral contract; atomic unit and largest real shape; authority and lifecycle owner; native primitive or specific capability gap; planned faithful evidence. Do not silently proceed through a correctness-critical unknown: resolve it or mark and surface it as `unproven`. Keep the record current through pivots and review.

1. Name the system boundary: atomic unit, authority, largest real shape, trusted inputs, and lifecycle owners.
2. Prefer existing mechanisms: repository patterns, deployed native primitives, and pinned contracts. Verify live mutable premises before relying on them. Add a custom mechanism only for a specific, evidenced capability gap.
3. Keep code and mutation reviewable: one behavioral contract, executable logic in tested source, and a version-matched real consumer or payload before mutation.
4. Prove behavior at the failure boundary: use faithful applicable topology and lifecycle, and exercise a representative coherence-threatening failure. Mark unavailable critical evidence `unproven` and surface it rather than silently accepting it.
5. Preserve review state: carry durable decisions and findings across pivots, adjudicate every feedback surface, and resolve or disposition each item in the platform's actual state rather than relying on a verbal reply.

## Work Iteration

A push or pull request is not the end of the task. When CI or automatic code review is configured:

1. Run the same formatting, lint, test, and build checks locally that CI will run when practical.
2. Push the changes, then monitor required CI and automatic reviews to completion.
3. Fix failures caused by the change, rerun the relevant local checks, push, and monitor again.
4. Address every relevant review point, push the fix, and repeat until no actionable feedback remains. Several review rounds may be necessary.
5. Resolve every GitHub review thread after adjudicating it. A reply or code change does not resolve the thread. Relevant feedback should be fixed and resolved; irrelevant feedback may be resolved without a reply.
6. Stop only when required checks pass, automatic reviews have completed with no remaining points to fix, and all review threads are resolved.

If merging or deployment is part of the task, validate the resulting state after the merge. End with a compact status recap rather than leaving the user to reconstruct the state.

## How I Write

Take the time to write less. If a sentence is not earning its place, cut it.

- Start with the actual content. Avoid throat-clearing such as "Here's the thing" or "Let's break this down."
- Be direct, brief, and human. Match the requested voice without adding ceremony.
- Avoid fake contrasts such as "Not X. Y." and rhetorical questions answered immediately.
- Avoid manufactured drama, one-word emphasis fragments, and inflated stakes.
- Prefer precise domain terms over buzzwords, invented jargon, and word soup.
- Do not use em dashes as a crutch. Use commas, periods, or parentheses.
- Do not pad prose into groups of three for rhythm.
- Avoid bold-first bullet spam unless the labels genuinely improve scanning.
- Do not preview, repeat, and summarize the same point. Say it once.
- Replace vague hedging with the specific implication, source, or uncertainty.
- Prefer active voice and name the actor.
- Do not use emojis unless explicitly requested.

Before sending, ask whether anything can be cut without losing meaning. If so, cut it.

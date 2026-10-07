---
name: distill-notes
description: Distill conversations and long answers into durable topic notes that preserve concrete reasoning, context, evidence, and implications. Use when asked to save important takeaways, distill a discussion, or update knowledge notes without a verbatim transcript or an abstract summary.
---

# Distill Notes

Save enough reasoning for the user to resume thinking without reopening the chat.
The unit to preserve is: what we think, why, what that changes, and what remains
uncertain. Do not turn the conversation into generic advice or a transcript.

## Find the home

1. Use the user's requested destination or documented vault/project location.
   Read relevant local instructions and inspect existing topic notes first. Ask
   for a destination only if it cannot be inferred; do not invent a new vault.
2. Prefer one evolving note per substantive question. Merge into a matching note
   rather than creating a new session summary each time. Split only when the
   questions have become independently useful.
3. Link a new note from the existing project/topic index when one exists. Follow
   local naming and metadata conventions; do not reorganize unrelated notes.

## Distill

- Preserve the user's goal, constraints, stage, and the question being answered.
  Include only context that explains why the conclusions matter.
- Keep concrete mechanisms and the chain from evidence to implication. Replace
  “modeling is important” with the actual target, failure mode, and decision it
  affects. Keep quantities, units, timescales, and caveats when consequential.
- Retain original wording where it carries the insight. Paraphrase to remove
  repetition, not to make a specific claim sound more general or more certain.
- Distinguish sourced findings, assistant proposals, user decisions, assumptions,
  and unresolved questions. A request to save a recommendation does not mean the
  user adopted it. Attribute recommendations explicitly when status is unclear.
- Attach source links to the claims they support, with a short indication of
  their relevance and limitations. Preserve citations from the conversation;
  do not imply fresh verification or invent sources. Flag unsupported claims.
- Preserve important objections and rejected alternatives with their reasons,
  even when they do not fit the favored direction. Drop conversational filler.
- Include the next useful action and what evidence would change the direction.
  Do not manufacture a commitment, deadline, or task the user never accepted.
- Record provenance: conversation date and a known session link, identifier, or
  transcript path. If none is available, give the topic and a distinctive user
  prompt, and state that the session locator is unavailable. Never invent a link.
  Use an existing transcript as a backstop; export one only when requested or
  required by the user's established workflow.
- Keep private conversation details in the intended personal destination. A
  reusable skill should contain generic guidance, not the user's private notes.

## Update without erasing the reasoning

Read the whole relevant note before editing. Preserve user-authored context and
deduplicate only equivalent claims. When new information contradicts a previous
claim, mark the disagreement and its sources; do not silently choose a winner.
When a conclusion actually changes, update the current position and leave a
short dated explanation of what changed and why. Avoid an append-only diary of
every conversation.

## Suggested shape

Adapt these headings to the note; omit empty sections and unnecessary metadata.

```markdown
# Topic or question

## Context
Goal, constraints, and why this question matters now.

## Current position
The concrete claim or direction, with its status and author.

## Reasoning and evidence
Mechanism → consequence → implication, with sources beside claims.

## Next step and open questions
Useful action, unresolved assumptions, and evidence that could change the plan.

## Provenance
Conversation date and retrievable source, or an explicit locator limitation.
```

## Check before finishing

Read the result against the conversation and the previous note:

- Could the user explain why this mattered and what to do with it later?
- Did any hypothesis become a fact, suggestion become a decision, or caveat vanish?
- Are the decisive details and contrary evidence still present?
- Can the user trace the claims to their sources and the discussion?
- Can anything be cut without losing meaning?

Verify the saved file and its local links. Report the note path briefly unless
the user requests another response format. Follow the destination's commit/sync
policy; do not assume personal notes belong in a public code repository.

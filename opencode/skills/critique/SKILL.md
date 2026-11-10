---
name: critique
description: Get an independent, evidence-based critique of something you built (a UI, site, component, document, or piece of writing) against its references and a quality bar, then fix and repeat until only nitpicks remain. Use before calling any user-facing work done, when the user asks for a review, critique, or second opinion, or when you can't tell whether something is good enough.
---

# Critique

You can't grade your own work: you know what you meant, so you see that instead of what's there. This loop puts the work in front of a critic who only sees the artifact, the references, and the bar.

## 1. Gather evidence

The critic judges only what you show it. Capture what a user would actually experience, not your best frame.

- **UI**: screenshots at desktop (1440 wide) and phone (390 wide), light and dark if both exist. Capture every state that matters: empty, loading, full, error, hover and focus, expanded, the slow path. Use a real browser (agent-browser with `--engine chrome`, since Lightpanda can't screenshot).
- **Motion**: anything that animates gets a frame strip. Record or step through it, ideally slowed down, and tile the frames into one image. Snaps, blank frames, and layout shift show up there and nowhere else.
- **Writing and docs**: the rendered page or the exact text, plus who it's for.
- **Live URL** if there is one, so the critic can look for itself.

Save evidence under a temp directory and pass the critic file paths.

## 2. Name the references and the bar

The critic needs something to judge against besides its own taste.

- **References**: the sources the work was built from (a project's `BRIEF.md`, tetrastack's `directions/<slug>.md`, the original it imitates, competing products).
- **The bar**: named examples of the quality expected (for interfaces, things like diffs.com, pierre.computer, oxide.computer, teenage.engineering), plus any constraints the user set.
- **What it's for**: one or two sentences on the product and its reader. Not your rationale for the choices you made: the critic should form its own view first.

## 3. Ask the critic

Spawn a fresh subagent (prefer the `researcher` agent, a different model than you) through the subagent tool, never the shell. Give it the evidence paths, the references, the bar, and the purpose, and ask for:

- findings ranked **blocker**, **major**, **minor**, or **nitpick**
- for each: what's wrong, where (screenshot and region, or quote), and why it matters to the reader
- what works and must survive the fixes
- a one-line verdict: is this at the bar?

Ask it to be blunt and specific, and to say "nothing" where nothing is wrong instead of inventing problems.

## 4. Adjudicate, fix, repeat

Treat findings as evidence, not orders.

- Fix every valid blocker, major, and minor. Check that the fix doesn't break what the critic said works.
- Dismiss findings that contradict the user's instructions, the brief, or a decision already made, and note why. Ask the user only when a finding would change established intent.
- Capture fresh evidence and send the same critic session the new round (continue it by session ID, so it remembers what it already flagged), with a short list of what changed and what you dismissed.
- Stop when the critic's remaining points are nitpicks and its verdict is "at the bar". If three rounds pass without convergence, stop and tell the user what's stuck.

## 5. Report

Give the user the critic's final verdict in its own words, what changed across rounds, what you dismissed and why, and where the evidence lives. Don't claim the work is at the bar unless the critic said so.

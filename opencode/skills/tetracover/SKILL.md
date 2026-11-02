---
name: tetracover
description: Create or overhaul a public-facing repository README, including structure, copy, installation and usage examples, truthful badges, screenshots, and terminal or application demos. Use when asked to write, improve, polish, redesign, or make a README, repository front page, showcase GIF, VHS recording, screenshot, or badge row.
---

# Tetracover

Build the repository's public front page from the project that actually exists.
Inspect first, preserve useful information, demonstrate real behavior, and leave
the README concise enough to scan.

## Operating rules

- Do the work end to end. Unless the user asks only for advice, edit the README,
  create the assets, run verification, and follow the requested git workflow.
- Treat source, manifests, CLI help, tests, workflows, release metadata, and the
  running product as sources of truth. Never invent features, compatibility,
  performance, package availability, test counts, or installation methods.
- Use the project's established name, vocabulary, casing, and visual language.
  Do not rename the project or manufacture a brand voice.
- Prefer information over promotion. Every sentence should identify the project,
  show what it does, help someone run it, or explain a meaningful mechanism.
- Keep metaphors, jokes, taglines, and decorative prose only when they already
  belong to the project. They are optional seasoning, never the structure.
- Preserve valuable existing material. If a clean front page would displace
  detailed setup or architecture notes, move that material to a descriptive
  Markdown file and link it. Verify the moved content before replacing it.
- Do not add badges, sections, screenshots, or diagrams merely because they are
  available. Include only elements backed by the repository and useful to a new
  reader.
- Do not use generated imagery when a real screenshot, terminal recording,
  diagram, or code example communicates the product better.

## 1. Inspect the repository

Read enough of the project to explain it without guessing:

1. Read the existing README and nearby documentation.
2. Inspect the top-level tree, package manifests, entry points, examples, tests,
   CI workflows, release configuration, and license.
3. Run `--help`, a smoke test, or the normal application when practical.
4. Inspect git remotes, default branch, recent commits, tags, releases, and
   package registry metadata.
5. Follow links or reference repositories supplied by the user. Read their raw
   READMEs rather than copying the visual impression from memory.
6. Identify the smallest compelling real workflow to demonstrate.

Useful tools:

- `Glob`, `Grep`, and `Read` for repository discovery.
- The shell for git state, tests, builds, CLI help, media inspection, and tool
  availability.
- Context7 for current syntax and behavior of libraries or CLIs.
- Firecrawl or a web fetcher for reference READMEs, package pages, and published
  documentation.
- `gh` for repository metadata, Actions workflows, releases, and post-push
  checks.
- A browser automation skill for web applications, responsive screenshots, and
  checking the final rendered GitHub page.

Do not expose secrets while inspecting configuration. Public endpoint URLs may
still carry cost or abuse implications; omit them unless the repository already
publishes them intentionally.

## 2. Decide what earns space

A reader should be able to answer these questions quickly:

- What is this?
- Why would I use it?
- What does using it look like?
- How do I install or run it?
- Where do I go for details?

Useful README material includes:

- project name and one precise identifying sentence
- one strong screenshot, GIF, command transcript, or code example
- canonical installation and shortest successful first run
- representative capabilities and constraints
- a compact usage example with real output
- links to documentation, playgrounds, releases, package registries, examples,
  or a cookbook
- architecture or mechanism when it is central to why the project is
  interesting
- development commands that contributors can actually run
- license and attribution when not already obvious from repository metadata

Possible supporting material:

- CI, release, package, coverage, documentation, or license badges
- keyboard shortcuts
- configuration examples
- supported providers, platforms, or formats
- lifecycle commands such as update, doctor, or uninstall
- known cold starts, hardware requirements, gating, or operational costs

The list is a toolbox, not a template. Omit unsupported and redundant material.

## 3. Shape the page

Put the highest-information material first. A reliable order is:

1. Name, identifying line, and essential links or badges.
2. Hero demonstration or immediately runnable example.
3. Installation and first successful use.
4. Capabilities, examples, or explanation.
5. Deeper operation, architecture, development, and references.

The first screen should not be a table of contents, origin story, wall of badges,
or architecture essay. Avoid repeating the tagline in the first paragraph.

Writing rules:

- Use short paragraphs and concrete nouns.
- Show commands and output instead of paraphrasing them.
- Keep examples internally consistent and runnable.
- Put caveats beside the action they affect.
- Link detailed material rather than reproducing it twice.
- Avoid generic claims such as "powerful", "robust", "seamless", "modern",
  "easy to use", or "production-ready" without evidence.
- Avoid feature inventories that give every feature equal weight.
- Avoid manufactured contrasts, rhetorical questions, and inflated stakes.
- Respect the repository's existing capitalization and prose conventions.

GitHub Markdown supports useful restrained HTML:

```html
<div align="center">

# project-name

**one identifying line**

![Descriptive demo alt text](docs/demo.gif)

</div>
```

Use relative paths for repository assets and documentation. Add descriptive alt
text. Prefer normal Markdown outside the small amount of HTML needed for
alignment, `<picture>`, or collapsible details.

## 4. Create truthful visual evidence

Use the real application and a clean, representative state. A useful demo shows
one complete idea rather than touring every control.

Before recording:

1. Build or install the current code.
2. Isolate demo config and history when possible.
3. Seed only data that the normal product can create.
4. Warm slow services or model weights outside the capture.
5. Choose a terminal or viewport size where important text remains readable on
   GitHub.
6. Remove personal data, tokens, private URLs, notifications, and unrelated
   windows.

For terminal applications, use VHS when available. Read
[`references/demos.md`](references/demos.md) for a tape template, timing,
inspection, and optimization commands.

For web or desktop applications, use browser automation or the application's
native screenshot tooling. Capture desktop and mobile when responsive behavior
is part of the product. Crop deliberately; do not place a tiny application in a
large empty desktop.

Recording rules:

- Hide build commands, shell setup, credentials, and cold-start dead time.
- Record real outputs. Do not mock the central behavior merely to make the demo
  deterministic.
- Use `Wait` or a generous bounded pause for asynchronous behavior.
- Keep typing readable but not theatrical.
- Let important final states remain visible for a few seconds.
- Inspect intermediate frames, not only the first or last frame.
- Prefer a short static screenshot when motion adds no information.
- Keep the source tape when it is reproducible and contains no secrets. Remove
  temporary recording configuration.

## 5. Add badges only when they resolve to facts

Badges are compact status and distribution links. They are not decoration.

Good candidates:

- required CI workflow
- latest release
- actual package registry version
- documentation build or link
- meaningful test coverage
- license

Check every badge URL and target. Use the real workflow filename, package name,
branch, and repository casing. Do not add a release badge to a repository with no
releases or a registry badge for an unpublished package.

Keep the row short. A failed, stale, or permanently "unknown" badge makes the
README worse. See [`references/badges.md`](references/badges.md) for verified
patterns and discovery commands.

## 6. Preserve detailed documentation

When replacing an existing README:

- Compare the old and new content before editing.
- Keep setup details, architecture notes, troubleshooting, storage paths,
  keybindings, and operational caveats somewhere discoverable.
- Use a specific filename such as `PROJECT_NOTES.md`, `DEVELOPMENT.md`,
  `ARCHITECTURE.md`, or `docs/deployment.md`; avoid names like `OLD_README.md`.
- Link the detailed document from the new README near the relevant setup or
  development section.
- If the existing README is already concise and accurate, improve it in place
  rather than splitting it gratuitously.

## 7. Verify the result

Before calling the work complete:

1. Run `git diff --check`.
2. Run the project's relevant smoke test, build, lint, or documentation checks.
3. Execute installation and usage commands when practical, or verify them
   against source and CLI help.
4. Confirm every relative file and image link exists with exact case.
5. Fetch external links or at least verify their targets and status.
6. Inspect image dimensions, duration, and file size.
7. View screenshots and sample multiple GIF frames.
8. Confirm moved documentation retained the intended old material.
9. Review the README from top to bottom and remove repetition.
10. Inspect staged changes so temporary config, recordings, secrets, or unrelated
    files are not committed.

After pushing, open or fetch the repository page and confirm GitHub renders the
README, images, HTML alignment, links, and code fences correctly. Monitor any CI
or automated review configured for the repository.

Useful checks:

```bash
git diff --check
git status --short
identify docs/demo.gif
ffprobe -v error -show_entries format=duration,size \
  -of default=noprint_wrappers=1 docs/demo.gif
gh run list --limit 10
```

## Completion report

Report only what changed and what was verified:

- README and documentation paths
- created media and what it demonstrates
- tests or rendering checks run
- commit, push, or PR state when applicable

Do not recap the README section by section.

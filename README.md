# dotagents

A small, portable agent setup built around [OpenCode](https://opencode.ai/) and [Helix](https://helix-editor.com/).

## Install with your agent

Point your agent at this repository and ask:

> Install this setup for me. Read the README, inspect my existing configuration, merge rather than overwrite it, and adapt commands and shell configuration to my system.

The agent should:

1. Install OpenCode, Helix, and the runtime needed for `npx` if they are missing.
2. Merge `opencode/` into the user's global OpenCode config directory (normally `~/.config/opencode/`). Preserve existing providers, models, plugins, permissions, and unrelated files.
3. Merge `helix/config.toml` into the user's Helix config (normally `~/.config/helix/config.toml`).
4. Set `EDITOR` and `VISUAL` to `hx` in the user's appropriate shell configuration.
5. Authenticate alphaXiv with `opencode mcp auth alphaxiv`.
6. Keep Linear and GitHub disabled unless the user wants the work integrations. If enabled, authenticate them with `opencode mcp auth linear` and `opencode mcp auth github`.
7. Restart OpenCode, run `opencode mcp list`, and fix any integration that does not connect.

## Included

- alphaXiv for papers
- Context7 for current library documentation
- Firecrawl for web research
- Playwright for browser automation
- Optional Linear and GitHub integrations
- Researcher, superagent, and watcher subagents
- A short global working agreement
- Soft-wrapped Helix editing

Models are intentionally unspecified so the subagents inherit whatever works in the user's environment.

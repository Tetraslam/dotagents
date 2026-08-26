# dotagents

A small, portable agent setup built around [OpenCode](https://opencode.ai/) and [Helix](https://helix-editor.com/).

## Install with your agent

Point your agent at this repository and ask:

> Install this setup for me. Read the README, inspect my existing configuration, merge rather than overwrite it, and adapt commands and shell configuration to my system.

The agent should:

1. Install OpenCode, Helix, and the runtime needed for `npx` if they are missing. If the Helix package provides `helix` rather than `hx`, add a durable `hx` wrapper or alias appropriate for the user's environment.
2. Install agent-browser with `npm i -g agent-browser && agent-browser install`, then install the Lightpanda binary for the user's platform by following the [engine guide](https://agent-browser.dev/engines/lightpanda). Both engines must work.
3. Merge `agent-browser/config.json` into `~/.agent-browser/config.json` and copy `agents/skills/agent-browser/` to `~/.agents/skills/agent-browser/`. Preserve unrelated configuration.
4. Merge `opencode/` into the user's global OpenCode config directory (normally `~/.config/opencode/`). Preserve existing providers, models, plugins, permissions, and unrelated files.
5. Merge `helix/config.toml` into the user's Helix config (normally `~/.config/helix/config.toml`).
6. Ask whether the user can connect OpenAI, then configure it with `opencode auth login`. The preferred models are `openai/gpt-5.6-sol-fast` for superagent and `openai/gpt-5.6-terra` for researcher and watcher. If OpenAI is unavailable, ask which available model to substitute before changing the agent files.
7. Set `EDITOR` and `VISUAL` to `hx` in the user's appropriate shell configuration.
8. Authenticate alphaXiv with `opencode mcp auth alphaxiv`.
9. Keep Linear and GitHub disabled unless the user wants the work integrations. If enabled, authenticate them with `opencode mcp auth linear` and `opencode mcp auth github`.
10. Restart OpenCode, run `opencode mcp list`, and fix any integration that does not connect. Verify agent-browser with both its default Lightpanda engine and `--engine chrome`.

## Included

- alphaXiv for papers
- Context7 for current library documentation
- Firecrawl for web research
- agent-browser for browser automation, with Lightpanda by default and Chrome when fidelity matters
- Optional Linear and GitHub integrations
- Researcher, superagent, and watcher subagents
- A short global working agreement
- Soft-wrapped Helix editing

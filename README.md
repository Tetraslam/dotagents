# dotagents

A small, portable agent setup built around [OpenCode](https://opencode.ai/) and [Helix](https://helix-editor.com/).

## Install with your agent

Point your agent at this repository and ask:

> Install this setup for me. Read the README, inspect my existing configuration, merge rather than overwrite it, and adapt commands and shell configuration to my system.

The agent should:

1. Install OpenCode, Herdr, Helix, and the runtime needed for `npx` if they are missing. If the Helix package provides `helix` rather than `hx`, add a durable `hx` wrapper or alias appropriate for the user's environment.
2. Install agent-browser with `npm i -g agent-browser && agent-browser install`, then install the Lightpanda binary for the user's platform by following the [engine guide](https://agent-browser.dev/engines/lightpanda). Both engines must work.
3. Merge `agent-browser/config.json` into `~/.agent-browser/config.json` and copy `agents/skills/agent-browser/` to `~/.agents/skills/agent-browser/`. Preserve unrelated configuration.
4. Merge `opencode/` into the user's global OpenCode config directory (normally `~/.config/opencode/`). Preserve existing providers, models, plugins, permissions, and unrelated files.
5. Run `herdr integration install opencode`, then link `bin/opencodr` into a directory on `PATH` rather than copying it. Preserve an existing command unless the user approves replacing it.
6. Merge `helix/config.toml` into the user's Helix config (normally `~/.config/helix/config.toml`).
7. Ask whether the user can connect OpenAI, then configure it with `opencode auth login`. The preferred models are `openai/gpt-5.6-sol-fast` for superagent and `openai/gpt-5.6-terra` for researcher and watcher. If OpenAI is unavailable, ask which available model to substitute before changing the agent files.
8. Set `EDITOR` and `VISUAL` to `hx` in the user's appropriate shell configuration.
9. Authenticate alphaXiv with `opencode mcp auth alphaxiv`.
10. Keep Linear and GitHub disabled unless the user wants the work integrations. If enabled, authenticate them with `opencode mcp auth linear` and `opencode mcp auth github`.
11. Restart OpenCode, run `opencode mcp list`, and fix any integration that does not connect. Verify agent-browser with both its default Lightpanda engine and `--engine chrome`.

## Included

- alphaXiv for papers
- Context7 for current library documentation
- Firecrawl for web research
- agent-browser for browser automation, with Lightpanda by default and Chrome when fidelity matters
- Optional Linear and GitHub integrations
- Researcher, superagent, and watcher subagents
- `opencodr` for repo-scoped, persistent OpenCode agents in Herdr
- A short global working agreement
- Soft-wrapped Helix editing

## Persistent OpenCode

`bin/opencodr` keeps selected OpenCode sessions in Herdr while exposing only
the agent terminal through the current native terminal tab. It creates one
Herdr workspace per Git root and one single-pane tab per durable role.

```bash
opencodr                 # Create or reconnect to the main role
opencodr review          # Create or reconnect to another durable role
opencodr --detach        # Ensure the main role is running without attaching
opencodr --takeover main # Replace another writable attachment
```

Use ordinary `opencode` for disposable sessions. OpenCode arguments passed
after `--` apply only when a role is first started.

# dotagents

A small, portable agent setup built around [OpenCode](https://opencode.ai/) and [Helix](https://helix-editor.com/).

## Install with your agent

Point your agent at this repository and ask:

> Install this setup for me. Read the README, inspect my existing configuration, merge rather than overwrite it, and adapt commands and shell configuration to my system.

The agent should:

1. Install OpenCode 2, Helix, and the runtime needed for `npx` if they are missing. Use the [V2 installer](https://opencode.ai/v2/install), or the `@opencode/cli` npm package. Remove competing V1 installations from PATH. If the Helix package provides `helix` rather than `hx`, add a durable `hx` wrapper or alias appropriate for the user's environment.
2. Install agent-browser with `npm i -g agent-browser && agent-browser install`, then install the Lightpanda binary for the user's platform by following the [engine guide](https://agent-browser.dev/engines/lightpanda). Both engines must work.
3. Merge `agent-browser/config.json` into `~/.agent-browser/config.json` and copy `agents/skills/agent-browser/` to `~/.agents/skills/agent-browser/`. Preserve unrelated configuration.
4. Merge `opencode/` into the user's global OpenCode config directory (normally `~/.config/opencode/`). The config uses the native V2 shape; convert any V1-shaped user settings it merges with rather than mixing formats inside one agent, provider, or MCP entry. Preserve existing providers, models, plugins, permissions, and unrelated files.
5. Start OpenCode once to migrate terminal preferences into `~/.config/opencode/cli.json`, then merge `opencode/cli.json` into it.
6. Merge `helix/config.toml` into the user's Helix config (normally `~/.config/helix/config.toml`).
7. Connect OpenAI with **Sign in with ChatGPT**, and the Claude subscription with **Claude Agent** (install Claude Code, run `claude auth login`), both through `/connect`. The agent models are listed [below](#models). If a provider is unavailable, ask which available model to substitute before changing the agent files.
8. Store API keys in mode-600 files in the OpenCode config directory: `alphaxiv-api-key` (alphaXiv Settings > API Keys), `context7-api-key`, and `firecrawl-api-key`, each without a trailing newline. `opencode.json` reads them with `{file:...}`.
9. Set `EDITOR` and `VISUAL` to `hx` in the user's appropriate shell configuration.
10. Keep Linear and GitHub disabled unless the user wants the work integrations. If enabled, set `disabled` to `false` and authenticate them with `/mcps`. Keep SF Compute's `givemeanode` disabled by default.
11. Ask whether the user has access to a LiteLLM gateway, and if so follow [Gateway](#gateway).
12. Run `opencode mcp list`, and fix any integration that does not connect. Verify agent-browser with both its default Lightpanda engine and `--engine chrome`.

## Models

| agent | model | on the gateway |
| --- | --- | --- |
| explore | `openai/gpt-6.1-terra` | `litellm/aire/ds-v4.1-flash` |
| general | `openai/gpt-6.1-terra` | `litellm/aire/ds-v4.1-flash` |
| title | `openai/gpt-6-luna` | `litellm/aire/ds-v4.1-flash` |
| superagent | `claude-agent/opus` | |
| researcher | `openai/gpt-6-astra` | |
| watcher | `openai/gpt-6.1-terra` | |
| fable | `claude-agent/fable` | |

The `gateway-routes` plugin probes the gateway once a minute and switches the first three agents between columns, so the same config works on and off the gateway's network. It only sees built-in agents, and an agent's `model` set in `opencode.json` or an agent file wins over it, so routed agents leave `model` unset. Change routes in the plugin's `agents` option.

## Gateway

`opencode.json` defines a `litellm` provider for a LiteLLM proxy. It stays inactive until it has a key and a URL.

1. Write the gateway's origin, without a path or trailing newline, to `~/.config/opencode/litellm-url`:

   ```bash
   printf '%s' 'https://litellm.example.com' > ~/.config/opencode/litellm-url
   chmod 600 ~/.config/opencode/litellm-url
   ```

2. Create a virtual key in the gateway's UI (`<origin>/ui`) and save it with `opencode auth login litellm`. A saved account takes precedence over `LITELLM_API_KEY`, so remove stale accounts with `opencode auth logout litellm` after rotating.
3. Check it:

   ```bash
   opencode run -m litellm/aire/glm-5.3-flash "reply with exactly: pong"
   ```

At Aire, the origin is the prod LiteLLM proxy on the tailnet, and keys come from its Okta-backed UI; see `core/infra/pulumi/api-gateway/USAGE.md`. Elsewhere, replace the `models` map with routes your gateway serves (`<origin>/v1/models`), with limits from `<origin>/v1/model/info`, and update the plugin's routes. Claude routes on the gateway set `compatibility.cacheFormat` to `anthropic` so prompt caching works through the OpenAI-compatible API.

## Included

- alphaXiv for papers
- Context7 for current library documentation
- Firecrawl for web research
- agent-browser for browser automation, with Lightpanda by default and Chrome when fidelity matters
- Optional Linear and GitHub integrations
- Optional SF Compute (`givemeanode`) MCP, disabled by default
- Researcher, superagent, watcher, and fable subagents, with gateway-aware routing for explore, general, and title
- A short global working agreement
- `distill-notes` for saving conversation insights with their reasoning, evidence, and decision status
- `tetracover` for README overhauls, and `xurl` for X (Twitter) API access
- Notifications that know what you are looking at: on Hyprland, nothing while you view the session, only blocking prompts and errors while you are in another terminal tab, and long finished turns once you leave the terminal (`attention/`)
- Soft-wrapped Helix editing

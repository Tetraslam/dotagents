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
8. Store API keys in mode-600 files in the OpenCode config directory: `alphaxiv-api-key` (alphaXiv Settings > API Keys), `context7-api-key`, and `firecrawl-api-key`, each without a trailing newline. `opencode.json` reads them with `{file:...}`. Ask whether the user has a Zipline instance for [artifacts](#artifacts).
9. Set `EDITOR` and `VISUAL` to `hx` in the user's appropriate shell configuration.
10. Keep Linear, GitHub, and Notion disabled unless the user wants the work integrations. If enabled, set `disabled` to `false` and authenticate them with `/mcps`. Keep SF Compute's `givemeanode` disabled by default.
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

## Sleep-time

When a session has been idle for 20 minutes, `sleep/` forks it into an archived background session and spends the time on what you will most likely want next: re-checking claims that were never backed by evidence, closing open loops, and preparing the next step. It investigates without acting (no edits, commits, pushes, or ticket changes), and runs on `litellm/aire/ds-v4.1-flash` when the gateway answers, otherwise `openai/gpt-6-astra-fast`.

The prompt footer shows `☾ dreaming…` while a pass runs and `☾ brief` when one is ready. `/brief` opens it in the fork that wrote it (with the work behind it), adopts it into the session's instructions for the next turn, or dismisses it; inside the fork, `/brief` acts on the original session. `/brief now` starts a pass immediately. Returning to the session mid-pass cancels it, a pass that finds nothing leaves no trace, and an adopted brief clears itself after the next turn. Tune `idleMinutes`, `minUserTurns`, `maxMinutes`, `dailyRuns`, and `model` in the plugin's options. It needs the shared OpenCode service, since forking goes through the service's own API.

## Artifacts

With `experimental.artifacts`, agents publish HTML or Markdown as artifacts. `artifacts/` makes them public pages on a [Zipline](https://zipline.diced.sh/) instance, inlining every file into one page and keeping the link stable across updates. Write the origin and an API token to mode-600 `~/.config/opencode/zipline-url` and `zipline-token`, without trailing newlines. Without them, artifacts stay on the local OpenCode server.

Zipline serves every upload with `Content-Security-Policy: sandbox`, which blocks scripts, so put a route in front of it that serves `/a/<name>` from `/raw/<name>` with a sandbox that allows scripts but not same-origin. Pages then run, but cannot touch Zipline's cookies or API. For Caddy:

```caddyfile
i.example.com {
	handle_path /a/* {
		rewrite * /raw{path}
		reverse_proxy 127.0.0.1:3200 {
			header_down Content-Security-Policy "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads"
		}
	}
	handle {
		reverse_proxy 127.0.0.1:3200
	}
}
```

## Tell

`tell/` gives every session three tools for working alongside the others on the machine. `who` lists live sessions with a handle (`<directory>/<task>`, so a handle says what a session is doing), task, directory, and state, plus claimed resources. `tell` messages a session by handle or ID: it lands at the recipient's next step boundary like a steering message, without interrupting it, and wakes it if idle; `fyi` waits for its next turn. Messages arrive labeled as coming from a peer agent, and the user's instructions keep precedence. `claim` leases a shared resource such as the tailnet or a GPU before disrupting it. Claims are ambient: while any exist, every other session's requests end with one line naming them (after the history, so the prompt cache survives), so nobody has to check first, and ordinary work needs no claim. `who` lists sessions active in the last 12 hours (`liveHours`), and `tell` allows 10 messages a minute per sender.

## Included

- alphaXiv for papers
- Context7 for current library documentation
- Firecrawl for web research
- agent-browser for browser automation, with Lightpanda by default and Chrome when fidelity matters
- Optional Linear, GitHub, and Notion integrations
- Optional SF Compute (`givemeanode`) MCP, disabled by default
- Researcher, superagent, watcher, and fable subagents, with gateway-aware routing for explore, general, and title
- A short global working agreement
- `distill-notes` for saving conversation insights with their reasoning, evidence, and decision status
- `tetracover` for README overhauls, and `xurl` for X (Twitter) API access, plus its MCP bridge (`x`, disabled until `xurl auth`)
- Notifications that know what you are looking at: on Hyprland, nothing while you view the session, only blocking prompts and errors while you are in another terminal tab, and long finished turns once you leave the terminal (`attention/`)
- [Tell](#tell): sessions that find each other, talk, and share resources
- [Sleep-time](#sleep-time) passes that work ahead while you are away, and [artifacts](#artifacts) published as shareable pages
- `/scroll`: doomscroll the X timeline since last time; the agent reads it, keeps the ML and research, checks the big claims, and publishes the stories worth seeing as an artifact (needs the `x` MCP)
- Per-directory [mise](https://mise.jdx.dev/) tool versions in agent shells (`mise-shims/`); no effect without mise
- Soft-wrapped Helix editing

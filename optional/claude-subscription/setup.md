# Claude subscription in OpenCode

Optional: Meridian runs the official Claude CLI using your existing Claude
account login. OpenCode keeps control of tools and permissions. This folder
is outside `opencode/` so installing the default setup does not enable it.

Tested on Linux with OpenCode **2.0.27**, Meridian **1.81.0**, and Opus **5.5**
on Claude Max, October 13, 2026. Meridian's installer only qualifies OpenCode
through 2.0.16; its bundled V2 plugin was tested directly on 2.0.27 here.

## Install

Requires Node.js 22+ and the official `claude` CLI on PATH, signed into your
Claude account. Install Meridian separately from OpenCode's plugin dependencies:

```bash
npm install --prefix "$HOME/.local/share/claude-subscription-bridge" \
  --save-exact --ignore-scripts @rynfar/meridian@1.81.0
env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN -u ANTHROPIC_BASE_URL \
  -u CLAUDE_CODE_OAUTH_TOKEN claude auth status
```

Confirm `authMethod` is `claude.ai`. Keep the resulting package lock for future
restores. Start the proxy with the same authenticated home and CLI on PATH:

```bash
env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN -u ANTHROPIC_BASE_URL \
  -u CLAUDE_CODE_OAUTH_TOKEN \
  MERIDIAN_HOST=127.0.0.1 MERIDIAN_PORT=3460 \
  MERIDIAN_CONFIG_DIR="$HOME/.config/claude-subscription-bridge" \
  MERIDIAN_SESSION_DIR="$HOME/.local/state/claude-subscription-bridge/sessions" \
  MERIDIAN_CREDENTIALS_READONLY=1 MERIDIAN_PASSTHROUGH=1 \
  MERIDIAN_DEFAULT_OPUS_MODEL=claude-opus-5-5 \
  MERIDIAN_1M_CONTEXT_SUPPORT=1 MERIDIAN_NO_UPDATE_CHECK=1 \
  "$HOME/.local/share/claude-subscription-bridge/node_modules/.bin/meridian"
```

Meridian itself will not refresh credentials; the official CLI still can.
The dashboard is at `http://127.0.0.1:3460`. For automatic startup, use your
platform's service manager with these variables and explicit Node/Claude paths.

Merge this into the global `opencode.json`, replacing `/home/YOU` and the
dotagents checkout path. Preserve existing plugins, providers and defaults:

```json
{
  "plugins": [
    "/home/YOU/.local/share/claude-subscription-bridge/node_modules/@rynfar/meridian/dist/meridian-v2",
    "/path/to/dotagents/optional/claude-subscription"
  ],
  "providers": {
    "meridian": {
      "name": "Claude subscription",
      "package": "@opencode/ai/providers/anthropic-compatible",
      "settings": {
        "baseURL": "http://127.0.0.1:3460/v1",
        "apiKey": "local-subscription",
        "headerTimeout": 300000,
        "chunkTimeout": 120000
      },
      "models": {
        "claude-opus-5-5": {
          "name": "Opus 5.5 (Claude Max)",
          "limit": { "context": 1000000, "output": 32768 }
        }
      }
    }
  }
}
```

The local key is a placeholder, not an Anthropic credential. Select
`meridian/claude-opus-5-5` in `/models`. The direct `anthropic` provider retains
its existing API billing. Opus uses a 1M context window.

## Why the local plugin exists

An account-authenticated request with OpenCode's full prompt returned
`You're out of extra usage` despite available subscription quota. Controlled
replays isolated it to the environment heading together with the environment
block. Replacing only `Here is some useful information about the environment
you are running in:` with `Working environment:` succeeded; restoring the
original reproduced the error. OpenCode's name, skills, tools and all environment
values remained in the successful request. The upstream classifier is unknown.

`index.ts` applies that replacement only to the `meridian` provider, including
title, generate and compaction requests. The bundled Meridian plugin handles
session identity and separates background titles from the main conversation.

## Evidence and limits

Verified against the real global OpenCode configuration: client-side file read
and tool-result continuation, recall after restarting the bridge, and fork
isolation. The usage endpoint reported no overage and zero extra-usage credits
consumed. Its enabled/disabled flag disagreed with the account UI, so do not use
that flag as billing authority. API-equivalent token cost estimates are not bills.

A 688,121-input-token request recovered markers from the beginning, middle
and end. OpenCode's live registry confirmed the 1M limit. Concurrent subagent,
cancellation and compaction behavior remain unproven on this host.
Successful subscription billing is a dated observation,
not a guarantee for other accounts or future prompts. Revalidate after upgrades.

To remove: stop the proxy, remove these two plugin entries and the `meridian`
provider. Existing API credentials and other providers need no changes.

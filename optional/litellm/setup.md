# LiteLLM gateway

Optional: route OpenCode through a [LiteLLM](https://docs.litellm.ai/) proxy,
such as a company gateway, with a personal virtual key.

Merge this into the global `opencode.json`, replacing `https://GATEWAY` with the
proxy's base URL. Preserve existing providers:

```json
{
  "providers": {
    "litellm": {
      "name": "LiteLLM",
      "env": ["LITELLM_API_KEY"],
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": {
        "baseURL": "https://GATEWAY/v1"
      },
      "models": {
        "anthropic/claude-fable-5-1": {
          "name": "Fable 5.1 (gateway)",
          "limit": { "context": 1000000, "output": 128000 }
        }
      }
    }
  }
}
```

Each `models` key must be a route name the gateway serves. List them with:

```bash
curl -s -H "Authorization: Bearer $LITELLM_API_KEY" https://GATEWAY/v1/models | jq -r '.data[].id'
```

Add the routes you use, with limits from `/v1/model/info`. OpenCode does not
discover this provider's models, and it needs the context limit to compact
on time.

Save the key with `opencode auth login litellm`, or set `LITELLM_API_KEY` on
the OpenCode service. A saved account takes precedence over the variable, so
remove stale accounts with `opencode auth logout litellm` after rotating.

Copy `agents/fable.md` to `~/.config/opencode/agents/` for a Fable subagent
that uses the gateway route above. Check it with:

```bash
opencode run -m litellm/anthropic/claude-fable-5-1 "reply with exactly: pong"
```

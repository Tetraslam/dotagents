---
name: xurl
description: Use xurl to fetch and interact with X (Twitter) data, including posts, search, users, timelines, and raw X API v2 endpoints.
---

# xurl

Use `xurl` for X/Twitter requests. Prefer concise shortcut commands whose JSON output can be inspected directly:

```bash
xurl read POST_ID_OR_URL
xurl search "QUERY" -n 10
xurl user @handle
xurl posts @handle -n 10
xurl whoami
```

Use `xurl /2/...` for endpoints without a shortcut. Read operations are safe to perform directly. Ask before posts, replies, likes, follows, DMs, deletions, or other mutations.

## Secret safety

- Never read or output files under `~/.xurl/`.
- Never run `xurl token`, use `--verbose`, or pass credentials as command arguments.
- Check authentication only with `xurl auth status`.

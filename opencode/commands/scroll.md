---
description: Doomscroll the X timeline together - the ML and research worth seeing since last time, as a page
---

Doomscroll my X home timeline with me. Posts since this time are new: !`f="${XDG_STATE_HOME:-$HOME/.local/state}/opencode-scroll-last"; mkdir -p "$(dirname "$f")"; cat "$f" 2>/dev/null || date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-24H +%Y-%m-%dT%H:%M:%SZ; date -u +%Y-%m-%dT%H:%M:%SZ > "$f"`

Focus or extra instructions, if any: $ARGUMENTS

1. Read the timeline with the `x` MCP tools: `get_users_me`, then `get_users_timeline` from that start time, 100 per page, following `next_token` up to 1,000 posts. Request `referenced_tweets.id` and `referenced_tweets.id.author_id` expansions, `created_at,public_metrics,author_id,note_tweet,referenced_tweets,entities` fields, and `username,name` user fields, so retweets and quotes resolve to the full original post.
2. Keep ML, AI, research, infra, and the occasional genuinely remarkable science or engineering post. Drop entertainment, idol and merch announcements, politics, memes, and ads unless the focus above asks for them.
3. Group posts about the same thing into one story. Rank stories by how much they matter to someone who builds and trains models, not by likes. A big claim with credible pushback is more interesting than a small one without.
4. For the top stories, open the linked blog, paper, or repo and check what the post claims before writing it up. Note replications, rebuttals, and caveats from the timeline itself.
5. Publish an artifact: a page I'd enjoy reading. Give it a dark theme, a header with the time window and how many posts were read, then the stories in rank order. Each story gets a sharp headline, two or three sentences on what happened and why it matters, the pushback when there is some, and links to the posts (`https://x.com/<username>/status/<id>`) and primary sources. End with a short "also" list of minor items. Keep it self-contained, legible on a phone, and quiet in tone, without emoji.
6. Reply in chat with the link and the three stories most worth my attention, one line each. If nothing worth reading happened, say so instead of padding.

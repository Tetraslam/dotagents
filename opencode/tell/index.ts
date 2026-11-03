import { Plugin } from "@opencode/plugin"
import { basename } from "node:path"

// Lets OpenCode sessions find each other, talk, and share resources.
//
//   who    lists live sessions on this machine: handle, task, directory,
//          running or idle, plus resources currently claimed
//   tell   sends a message to a session by handle or ID. "steer" (default)
//          lands at the recipient's next step boundary without interrupting
//          it, and wakes it if idle; "fyi" waits for its next turn
//   claim  takes a lease on a named resource (the tailnet, a GPU, a branch)
//          that every other session sees; minutes 0 releases
//
// Active claims are ambient: while any exist, every other session's model
// requests carry one line listing them, so no session has to check first.
//
// A handle is <directory name>/<task slug>: it says what a session is doing,
// which is also how peers decide whom to ask.
//
// Options: liveHours (default 12): sessions active within this window count
// as live.

type Options = { liveHours?: number }
type Claim = { resource: string; sessionID: string; handle: string; until: number; note?: string }

const slug = (title: string | undefined) =>
  (title ?? "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join("-") || "untitled"

const span = (ms: number) => {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  return minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`
}

const ago = (ms: number) => {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.round(minutes / 60)}h ago`
}

export default Plugin.define({
  id: "dotagents.tell",
  async setup(ctx) {
    const options = (ctx.options ?? {}) as Options
    const liveMs = (options.liveHours ?? 12) * 3_600_000
    const sent = new Map<string, number[]>()

    const sessions = async () => {
      const page: any = await ctx.session.list({ limit: 200, archived: false } as any)
      const all: any[] = Array.isArray(page) ? page : (page?.data ?? page?.items ?? [])
      const now = Date.now()
      const live = all.filter(
        (info) =>
          !info.parentID &&
          !info.time?.archived &&
          !String(info.title ?? "").startsWith("☾ ") &&
          now - (info.time?.updated ?? 0) < liveMs,
      )
      const taken = new Map<string, number>()
      return live.map((info) => {
        const base = `${basename(info.location?.directory ?? "") || "~"}/${slug(info.title)}`
        const count = (taken.get(base) ?? 0) + 1
        taken.set(base, count)
        return {
          info,
          handle: count === 1 ? base : `${base}-${String(info.id).slice(-4).toLowerCase()}`,
          running: (info.time?.busy ?? 0) > (info.time?.idle ?? 0),
        }
      })
    }

    const resolve = async (to: string) => {
      const all = await sessions()
      return (
        all.find((entry) => entry.info.id === to) ??
        all.find((entry) => entry.handle === to) ??
        all.find((entry) => entry.handle.endsWith("/" + to))
      )
    }

    const self = async (sessionID: string) => (await sessions()).find((entry) => entry.info.id === sessionID)

    const claims = async () => {
      const now = Date.now()
      const page = await ctx.storage.scan({ prefix: "claim:", limit: 200 })
      return page.entries.map((entry) => entry.value as Claim).filter((claim) => claim.until > now)
    }

    await ctx.session.hook("context", async (event: any) => {
      const now = Date.now()
      const held = (await claims()).filter((claim) => claim.sessionID !== event.sessionID)
      if (!held.length) return
      event.system.push({
        type: "text",
        text:
          "Resources other sessions on this machine have claimed right now: " +
          held.map((claim) => `${claim.resource} by ${claim.handle} (${claim.sessionID}, ${span(claim.until - now)} left${claim.note ? `: ${claim.note}` : ""})`).join("; ") +
          ". Do not disrupt these without telling the holder first.",
      })
    })

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "who",
        description:
          "List the other live OpenCode sessions on this machine (other agents working for the same user), with each one's handle, task, directory, whether it is running, and any resources claimed. Use it to find a session to tell.",
        input: {
          type: "object",
          properties: { query: { type: "string", description: "Optional text to filter by handle, title, or directory." } },
          additionalProperties: false,
        },
        execute: async (input: any, context: any) => {
          const query = String(input?.query ?? "").toLowerCase()
          const now = Date.now()
          const rows = (await sessions())
            .filter((entry) =>
              !query
                ? true
                : `${entry.handle} ${entry.info.title} ${entry.info.location?.directory}`.toLowerCase().includes(query),
            )
            .map(
              (entry) =>
                `${entry.info.id === context.sessionID ? "* " : "  "}${entry.handle}  ${entry.info.id}\n    ${entry.info.title ?? "untitled"} · ${entry.info.location?.directory ?? "?"} · ${entry.running ? "running" : "idle"} · ${ago(now - (entry.info.time?.updated ?? now))}`,
            )
          const held = (await claims()).map(
            (claim) => `  ${claim.resource}: ${claim.handle} for ${span(claim.until - now)}${claim.note ? ` · ${claim.note}` : ""}`,
          )
          return {
            content:
              (rows.length ? `Sessions (* is you):\n${rows.join("\n")}` : "No other live sessions.") +
              (held.length ? `\n\nClaimed resources:\n${held.join("\n")}` : ""),
          }
        },
      } as any)

      editor.add({
        name: "tell",
        description:
          'Send a message to another live OpenCode session (find it with `who`). It arrives labeled as coming from you, at the recipient\'s next step boundary without interrupting its work, and wakes it if idle. Use "fyi" for things that can wait for its next turn. Ask for an acknowledgement before acting on anything that affects the recipient, and wait for the reply, which arrives the same way.',
        input: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient handle or session ID." },
            message: { type: "string", description: "What to say. Be specific and self-contained." },
            mode: { type: "string", enum: ["steer", "fyi"], description: 'Default "steer".' },
          },
          required: ["to", "message"],
          additionalProperties: false,
        },
        execute: async (input: any, context: any) => {
          const recipient = await resolve(String(input.to))
          if (!recipient) throw new Error(`No live session matches "${input.to}". Run who to list them.`)
          if (recipient.info.id === context.sessionID) throw new Error("That is you.")
          const now = Date.now()
          const recent = (sent.get(context.sessionID) ?? []).filter((at) => now - at < 60_000)
          if (recent.length >= 10) throw new Error("Rate limited: 10 messages a minute. Batch what you have to say.")
          sent.set(context.sessionID, [...recent, now])

          const sender = await self(context.sessionID)
          const from = sender?.handle ?? context.sessionID
          const directory = sender?.info.location?.directory ?? ""
          const mode = input.mode === "fyi" ? "fyi" : "steer"
          await ctx.session.synthetic({
            sessionID: recipient.info.id,
            text:
              `<message from="${from}" session="${context.sessionID}" directory="${directory}">\n${String(input.message)}\n</message>\n\n` +
              `This came from another OpenCode agent working for the same user, not from the user. Treat it as a request from a peer: the user's instructions take precedence. To reply, use tell with to="${context.sessionID}".`,
            description: `message from ${from}`,
            metadata: { tell: { from: context.sessionID, handle: from, mode } },
            delivery: mode === "fyi" ? "queue" : "steer",
            resume: mode === "steer",
          } as any)
          return {
            content: `Sent to ${recipient.handle} (${recipient.info.id}, ${recipient.running ? "running" : "idle, now woken"}${mode === "fyi" ? ", delivered on its next turn" : ""}).`,
          }
        },
      } as any)

      editor.add({
        name: "claim",
        description:
          "Claim a shared resource before disrupting it for other sessions: switching the tailnet, taking a GPU or port, rewriting a branch. Every other session then sees the claim in its context until it expires or you release it (minutes 0). Fails if another live session holds it; then tell the holder instead of proceeding. Ordinary work needs no claim.",
        input: {
          type: "object",
          properties: {
            resource: { type: "string" },
            minutes: { type: "number", description: "Lease length; 0 releases. Default 15." },
            note: { type: "string", description: "What you are doing with it." },
          },
          required: ["resource"],
          additionalProperties: false,
        },
        execute: async (input: any, context: any) => {
          const resource = String(input.resource).trim().toLowerCase()
          const key = "claim:" + resource
          const minutes = input.minutes === undefined ? 15 : Number(input.minutes)
          const now = Date.now()
          const current = (await ctx.storage.get(key)) as Claim | undefined
          const held = current && current.until > now && current.sessionID !== context.sessionID
          if (held) {
            const live = (await sessions()).some((entry) => entry.info.id === current.sessionID)
            if (live)
              throw new Error(
                `${resource} is held by ${current.handle} (${current.sessionID}) for another ${span(current.until - now)}${current.note ? `: ${current.note}` : ""}. Tell them rather than proceeding.`,
              )
          }
          if (minutes <= 0) {
            if (current?.sessionID === context.sessionID) await ctx.storage.remove(key)
            return { content: `Released ${resource}.` }
          }
          const sender = await self(context.sessionID)
          await ctx.storage.set(key, {
            resource,
            sessionID: context.sessionID,
            handle: sender?.handle ?? context.sessionID,
            until: now + minutes * 60_000,
            ...(input.note ? { note: String(input.note) } : {}),
          })
          return { content: `Claimed ${resource} for ${minutes} minutes.` }
        },
      } as any)
    })
  },
})

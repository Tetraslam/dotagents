import { Plugin } from "@opencode/plugin"
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { type Brief, Sleep } from "./rpc"

// Sleep-time compute. When a session has been idle for a while, fork it into
// an archived background session and spend the time on the work the user is
// most likely to want next: re-checking unverified claims, closing open
// loops, and preparing the next step. The result is a brief the TUI offers on
// return; adopting it attaches the brief to the session's instructions.
//
// Options (all optional):
//   idleMinutes   idle time before a pass starts (default 20)
//   minUserTurns  user messages a session needs first (default 2)
//   maxMinutes    wall-clock cap per pass (default 20)
//   dailyRuns     passes per rolling 24 hours, all sessions (default 24)
//   health        URL that returns 2xx when the gateway is reachable
//   model         { gateway: "<model>", fallback: "<model>" }

type Options = {
  idleMinutes?: number
  minUserTurns?: number
  maxMinutes?: number
  dailyRuns?: number
  health?: string
  model?: { gateway?: string; fallback?: string }
}

const PREFIX = "☾ "
const ENTRY = "sleep-brief"
const NOTHING = /^\s*NOTHING\s*\.?\s*$/

// Background passes investigate; they do not act. Everything else inherits.
const PERMISSIONS = [
  { action: "edit", resource: "*", effect: "deny" },
  { action: "subagent", resource: "*", effect: "deny" },
  { action: "question", resource: "*", effect: "deny" },
  ...[
    "git commit*", "git push*", "git reset*", "git checkout*", "git rebase*", "git merge*", "gh pr *", "gh issue *",
    "*pnpm i*", "*pnpm install*", "*pnpm add*", "*pnpm dev*", "*pnpm run dev*", "*npm i*", "*npm install*",
    "*bun install*", "*bun add*", "*uv sync*", "*pip install*", "*docker compose up*", "*docker run*",
    "*docker start*", "*systemctl*", "*tailscale switch*", "*tailscale up*", "*tailscale down*",
  ].map(
    (resource) => ({ action: "shell", resource, effect: "deny" }),
  ),
  { action: "linear_save*", resource: "*", effect: "deny" },
  { action: "linear_delete*", resource: "*", effect: "deny" },
]

const prompt = (minutes: number) => `This is sleep time. You are a background fork of the conversation above, started because the user has been away for ${minutes} minutes. The original session is untouched and nothing here is visible until the user opens your brief. Use the time to make their return faster.

Work on whatever is most valuable, roughly in this order:

1. Check what was claimed. Re-verify consequential claims in the conversation that were never backed by evidence: a command that should pass, a fact stated from memory, a number, a "this works". Correct what is wrong.
2. Close open loops. Investigate anything left pending, promised, flagged as unproven, or deferred, as far as you can without changing anything.
3. Prepare the next step. Predict what the user will most likely ask for next and do the groundwork: gather the facts, sources and file locations, and write the plan or draft so the next turn can act immediately.

Rules:
- Investigate, do not act. Do not edit or create files, commit, push, send messages, deploy, or change tickets or any external state. Do not install dependencies, start servers, containers or long-running processes, or run setup scripts. Reading, searching, fetching, and running read-only commands or existing tests are fine. If checking something would need setup, report it as [open] with the exact command instead.
- Do not redo work the conversation already finished.
- Depth on one or two valuable items beats shallow coverage of many. Stop when more work stops changing the answer.
- Separate what you verified, with its evidence, from what you infer.

End with the brief as your final message:

## While you were away
- One line per finding, most important first, each starting with [verified], [corrected], [prepared] or [open].

Then anything worth keeping in full (a draft, a plan, commands, sources) under short headings. Keep it under 300 words unless a draft needs the room. Write for the user, in their voice preferences.

If nothing is worth the user's attention, reply with exactly NOTHING.`

// Fork and archive are not in the plugin API, so those two calls go through
// this server's own HTTP API, found through the service registration.
function service() {
  const state = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state")
  try {
    const info = JSON.parse(readFileSync(join(state, "opencode", "service.json"), "utf8"))
    if (info.pid !== process.pid) return undefined
    return { url: String(info.url), auth: "Basic " + btoa(`opencode:${info.password}`) }
  } catch {
    return undefined
  }
}

async function api(method: string, path: string, body?: unknown) {
  const server = service()
  if (!server) throw new Error("sleep-time needs the shared OpenCode service")
  const response = await fetch(server.url + path, {
    method,
    headers: { authorization: server.auth, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`)
  const text = await response.text()
  return text ? JSON.parse(text) : undefined
}

function ref(model: string) {
  const slash = model.indexOf("/")
  return { providerID: model.slice(0, slash), id: model.slice(slash + 1) }
}

function text(message: any) {
  const parts: any[] = Array.isArray(message?.content) ? message.content : []
  return parts
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim()
}

export default Plugin.define({
  id: "dotagents.sleep",
  async setup(ctx) {
    const options = (ctx.options ?? {}) as Options
    const idleMs = (options.idleMinutes ?? 20) * 60_000
    const minUserTurns = options.minUserTurns ?? 2
    const maxMs = (options.maxMinutes ?? 20) * 60_000
    const dailyRuns = options.dailyRuns ?? 24
    const gateway = options.model?.gateway ?? "litellm/aire/ds-v4.1-flash"
    const fallback = options.model?.fallback ?? "openai/gpt-6-astra-fast"

    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const running = new Map<string, string>()
    const forks = new Set<string>()

    const read = async (sessionID: string) => ((await ctx.storage.get("s:" + sessionID)) ?? null) as Brief | null

    let rpc: Awaited<ReturnType<typeof ctx.rpc.register>> | undefined
    const write = async (sessionID: string, brief: Brief | null) => {
      if (brief) await ctx.storage.set("s:" + sessionID, brief as any)
      else await ctx.storage.remove("s:" + sessionID)
      await rpc?.events.emit("changed", { sessionID, brief }).catch(() => undefined)
    }

    const drop = async (forkID: string | undefined) => {
      if (!forkID) return
      forks.delete(forkID)
      await ctx.session.remove({ sessionID: forkID }).catch(() => undefined)
    }

    const reachable = async () => {
      if (!options.health) return false
      try {
        return (await fetch(options.health, { signal: AbortSignal.timeout(3_000) })).ok
      } catch {
        return false
      }
    }

    const budget = async () => {
      const now = Date.now()
      const runs = (((await ctx.storage.get("runs")) ?? []) as number[]).filter((at) => now - at < 86_400_000)
      if (runs.length >= dailyRuns) return false
      await ctx.storage.set("runs", [...runs, now])
      return true
    }

    const ours = async (sessionID: string) => {
      if (forks.has(sessionID)) return undefined
      const info: any = await ctx.session.get({ sessionID }).catch(() => undefined)
      if (!info || info.parentID || info.fork || info.time?.archived) return undefined
      if (typeof info.title === "string" && info.title.startsWith(PREFIX)) return undefined
      if (info.location?.directory && info.location.directory !== ctx.location.directory) return undefined
      return info
    }

    const run = async (sessionID: string, manual = false) => {
      if (running.has(sessionID)) return read(sessionID)
      const info = await ours(sessionID)
      if (!info) return null
      const messages: any[] = (await ctx.session.context({ sessionID }).catch(() => [])) as any[]
      const last = messages.at(-1)?.id ?? ""
      const previous = await read(sessionID)
      if (!manual) {
        if (messages.filter((message) => message?.type === "user").length < minUserTurns) return previous
        if (previous?.basedOn === last) return previous
        if (!(await budget())) return previous
      }

      const model = (await reachable()) ? gateway : fallback
      const startedAt = Date.now()
      running.set(sessionID, "")
      await write(sessionID, { status: "running", model, basedOn: last, startedAt })
      await drop(previous?.forkID)
      if (previous?.status === "adopted") {
        await ctx.session.instructions.entry.remove({ sessionID, key: ENTRY }).catch(() => undefined)
      }

      let forkID: string | undefined
      try {
        const fork = await api("POST", `/api/session/${sessionID}/fork`, {})
        forkID = String(fork.data.id)
        forks.add(forkID)
        running.set(sessionID, forkID)
        await api("PATCH", `/api/session/${forkID}`, {
          title: PREFIX + (info.title ?? "sleep"),
          archived: true,
          permissions: PERMISSIONS,
        })
        await ctx.session.switchModel({ sessionID: forkID, model: ref(model) } as any)
        const minutes = Math.max(1, Math.round((Date.now() - (info.time?.idle ?? info.time?.updated ?? Date.now())) / 60_000))
        await ctx.session.prompt({ sessionID: forkID, text: prompt(minutes) } as any)
        const cap = setTimeout(() => {
          void ctx.session.interrupt({ sessionID: forkID!, resume: false } as any).catch(() => undefined)
        }, maxMs)
        try {
          await ctx.session.wait({ sessionID: forkID } as any)
        } finally {
          clearTimeout(cap)
        }
        if (running.get(sessionID) !== forkID) return read(sessionID)
        const reply: any[] = (await ctx.session.context({ sessionID: forkID })) as any[]
        const brief = text(reply.findLast((message) => message?.type === "assistant" && text(message)))
        const empty = !brief || NOTHING.test(brief)
        const result: Brief = empty
          ? { status: "empty", model, basedOn: last, startedAt, finishedAt: Date.now() }
          : { status: "ready", forkID, model, brief, basedOn: last, startedAt, finishedAt: Date.now() }
        if (empty) await drop(forkID)
        await write(sessionID, result)
        return result
      } catch (error) {
        await drop(forkID)
        if (running.get(sessionID) !== (forkID ?? "")) return read(sessionID)
        const result: Brief = {
          status: "failed",
          model,
          error: error instanceof Error ? error.message : String(error),
          basedOn: last,
          startedAt,
          finishedAt: Date.now(),
        }
        await write(sessionID, result)
        return result
      } finally {
        if (running.get(sessionID) === (forkID ?? "")) running.delete(sessionID)
      }
    }

    // The user came back before the pass finished: its premise is stale.
    const cancel = async (sessionID: string) => {
      const forkID = running.get(sessionID)
      if (forkID === undefined) return
      running.delete(sessionID)
      if (forkID) await ctx.session.interrupt({ sessionID: forkID, resume: false } as any).catch(() => undefined)
      await drop(forkID)
      await write(sessionID, null)
    }

    const adopt = async (sessionID: string) => {
      const brief = await read(sessionID)
      if (brief?.status !== "ready" || !brief.brief) return brief
      await ctx.session.instructions.entry.put({
        sessionID,
        key: ENTRY,
        value: `A background pass ran while the user was away and the user adopted its brief. Treat its findings as input to verify, not as settled fact.\n\n${brief.brief}`,
      } as any)
      const next: Brief = { ...brief, status: "adopted" }
      await write(sessionID, next)
      return next
    }

    const dismiss = async (sessionID: string) => {
      const brief = await read(sessionID)
      await drop(brief?.forkID)
      if (brief?.status === "adopted") {
        await ctx.session.instructions.entry.remove({ sessionID, key: ENTRY }).catch(() => undefined)
      }
      await write(sessionID, null)
      return null
    }

    rpc = await ctx.rpc.register(Sleep, {
      get: async (input: any) => read(input.sessionID),
      run: async (input: any) => {
        void run(input.sessionID, true)
        return { started: true }
      },
      adopt: async (input: any) => adopt(input.sessionID),
      dismiss: async (input: any) => dismiss(input.sessionID),
    })

    // A pass that was running when the server stopped will never finish.
    for (let after: string | undefined; ; ) {
      const page = await ctx.storage.scan({ prefix: "s:", after, limit: 100 })
      for (const entry of page.entries) {
        const brief = entry.value as Brief
        if (brief?.status !== "running") continue
        const sessionID = entry.key.slice(2)
        const info: any = await ctx.session.get({ sessionID }).catch(() => undefined)
        if (info?.location?.directory && info.location.directory !== ctx.location.directory) continue
        await drop(brief.forkID)
        await write(sessionID, { ...brief, status: "failed", error: "interrupted by a server restart", finishedAt: Date.now() })
      }
      if (!page.next) break
      after = page.next
    }

    const controller = new AbortController()
    void (async () => {
      const events = ctx.event.subscribe({
        types: ["session.execution.started", "session.execution.succeeded"],
        signal: controller.signal,
      } as any) as AsyncIterable<any>
      for await (const event of events) {
        const sessionID = event?.data?.sessionID
        if (typeof sessionID !== "string" || forks.has(sessionID)) continue
        clearTimeout(timers.get(sessionID))
        timers.delete(sessionID)
        if (event.type === "session.execution.started") {
          void cancel(sessionID)
          continue
        }
        // An adopted brief has served its turn once the session runs again.
        const current = await read(sessionID)
        if (current?.status === "adopted") void dismiss(sessionID)
        timers.set(
          sessionID,
          setTimeout(() => {
            timers.delete(sessionID)
            void run(sessionID)
          }, idleMs),
        )
      }
    })().catch(() => undefined)

    return () => {
      controller.abort()
      for (const timer of timers.values()) clearTimeout(timer)
    }
  },
})

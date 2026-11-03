import { Plugin } from "@opencode/plugin/tui"
import type { AttentionSoundName } from "@opencode/plugin/tui/context"
import { execFile } from "node:child_process"

// Replaces the built-in `opencode.notifications` (disable it with
// "-opencode.notifications" in cli.json `plugins`). The built-in notifies
// whenever the terminal reports blur, which includes switching terminal tabs.
// This one asks the compositor what you are actually looking at:
//
// - looking at this session        -> nothing
// - in the terminal, another tab   -> only prompts that block and errors
// - elsewhere                      -> those, plus finished turns that ran at
//                                     least `minTurnMs`
//
// Subagent completions and interrupts never alert. Sounds follow the same
// rules. Without a supported compositor it falls back to terminal focus.
//
// Options:
//   terminal   regex matched against the focused window class
//              (default "ghostty")
//   minTurnMs  shortest finished turn worth an alert when away (default 45000)

type Where = "viewing" | "terminal" | "away" | "unknown"

const hyprland = () =>
  new Promise<{ class: string; title: string } | undefined>((resolve) => {
    if (!process.env.HYPRLAND_INSTANCE_SIGNATURE) return resolve(undefined)
    execFile("hyprctl", ["activewindow", "-j"], { timeout: 1_000 }, (error, stdout) => {
      if (error) return resolve(undefined)
      try {
        const window = JSON.parse(stdout)
        resolve({ class: String(window.class ?? ""), title: String(window.title ?? "") })
      } catch {
        resolve(undefined)
      }
    })
  })

// Mirrors the TUI's own terminal title for a session.
const terminalTitle = (title: string) => `OC | ${title.length > 40 ? title.slice(0, 37) + "…" : title}`

export default Plugin.define({
  id: "dotagents.attention",
  setup(context) {
    const terminal = new RegExp(String(context.options?.terminal ?? "ghostty"), "i")
    const minTurnMs = Number(context.options?.minTurnMs ?? 45_000)
    const started = new Map<string, number>()
    const seen = new Set<string>()

    const where = async (sessionID: string): Promise<Where> => {
      const window = await hyprland()
      if (!window) return "unknown"
      if (!terminal.test(window.class)) return "away"
      const title = context.data.session.get(sessionID)?.title
      return title && window.title === terminalTitle(title) ? "viewing" : "terminal"
    }

    const alert = async (
      sessionID: string,
      kind: "blocking" | "error" | "done",
      message: string,
      sound: AttentionSoundName,
      title?: string,
    ) => {
      const session = context.data.session.get(sessionID)
      if (session?.parentID) return
      const place = await where(sessionID)
      if (place === "viewing") return
      if (kind === "done") {
        const began = started.get(sessionID) ?? session?.time.busy
        const long = began !== undefined && Date.now() - began >= minTurnMs
        if (place === "terminal" || !long) return
      }
      const when = place === "unknown" ? "blurred" : "always"
      void context.attention.notify({
        title: title ?? session?.title,
        message,
        notification: { when },
        sound: { name: sound, when },
      })
    }

    const once = (id: string) => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    }

    const dispose = [
      context.data.on("session.execution.started", (event) => {
        started.set(event.data.sessionID, Date.now())
      }),
      context.data.on("form.created", (event) => {
        if (!once(event.data.form.id)) return
        void alert(event.data.form.sessionID, "blocking", "Input needs response", "question", event.data.form.title)
      }),
      context.data.on("permission.asked", (event) => {
        if (!once(event.data.id)) return
        void alert(event.data.sessionID, "blocking", "Permission needs input", "permission")
      }),
      context.data.on("session.execution.succeeded", (event) => {
        const sessionID = event.data.sessionID
        // A running subagent's report wakes the session again, so it isn't done yet.
        const waiting = context.data.session
          .family(sessionID)
          .some(
            (child) =>
              child !== sessionID &&
              context.data.session.get(child)?.parentID === sessionID &&
              context.data.session.status(child) === "running",
          )
        if (waiting) return
        void alert(sessionID, "done", "Session done", "done")
        started.delete(sessionID)
      }),
      context.data.on("session.execution.failed", (event) => {
        const error = event.data.error
        if (error.type === "provider.free-limit" || error.type === "provider.go-limit") return
        void alert(event.data.sessionID, "error", error.message, "error")
        context.ui.toast.show({
          sessionID: event.data.sessionID,
          title: "Session failed",
          message: error.message,
          variant: "error",
        })
        started.delete(event.data.sessionID)
      }),
      context.data.on("session.execution.interrupted", (event) => {
        started.delete(event.data.sessionID)
      }),
    ]

    return () => dispose.reverse().forEach((cleanup) => cleanup())
  },
})

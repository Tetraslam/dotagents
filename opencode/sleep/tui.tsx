import { Plugin } from "@opencode/plugin/tui"
import { createSignal, Show } from "solid-js"
import { type Brief, Sleep } from "./rpc"

// Shows the session's sleep-time brief under the prompt and offers it through
// /brief: read it in the fork that wrote it, adopt it into the session, or
// dismiss it. Inside the fork, /brief acts on the original session.
// `/brief now` starts a pass immediately.

export default Plugin.define({
  id: "dotagents.sleep.tui",
  setup(context) {
    const rpc = context.client.rpc(Sleep)
    const [briefs, setBriefs] = createSignal<Record<string, Brief | null>>({})

    // Inside a sleep fork, act on the session it was forked from.
    const current = () => {
      const route = context.ui.router.current() as any
      if (route?.type !== "session") return undefined
      const session = context.data.session.get(route.sessionID) as any
      return (session?.title?.startsWith("☾ ") && session.fork?.sessionID) || (route.sessionID as string)
    }
    const put = (sessionID: string, brief: Brief | null) => setBriefs((all) => ({ ...all, [sessionID]: brief }))
    const location = (sessionID: string) => {
      const directory = context.data.session.get(sessionID)?.location?.directory
      return directory ? { location: { directory } } : undefined
    }
    const load = (sessionID: string) =>
      void rpc.get({ sessionID }, location(sessionID) as any).then(
        (brief: any) => put(sessionID, brief ?? null),
        () => undefined,
      )

    const stop = [
      rpc.events.on("changed", (event: any) => put(event.data.sessionID, event.data.brief ?? null)),
      context.data.on("server.connected" as any, () => {
        const id = current()
        if (id) load(id)
      }),
    ]

    const call = (method: "run" | "adopt" | "dismiss", sessionID: string) =>
      (rpc as any)[method]({ sessionID }, location(sessionID)).catch((error: unknown) =>
        context.ui.toast.show({
          title: "Sleep-time",
          message: error instanceof Error ? error.message : String(error),
          variant: "error",
        }),
      )

    const viewing = (brief: Brief) => {
      const route = context.ui.router.current() as any
      return route?.type === "session" && route.sessionID === brief.forkID
    }

    const open = async (sessionID: string, input?: string) => {
      if (input?.trim() === "now") {
        await call("run", sessionID)
        context.ui.toast.show({ message: "☾ dreaming…", variant: "info" })
        return
      }
      const brief = briefs()[sessionID]
      if (!brief || brief.status === "empty") {
        context.ui.toast.show({
          message: brief ? "The last pass found nothing worth your attention." : "No brief yet. Run /brief now to start one.",
          variant: "info",
        })
        return
      }
      if (brief.status === "running") {
        context.ui.toast.show({ message: `☾ dreaming on ${brief.model}…`, variant: "info" })
        return
      }
      if (brief.status === "failed") {
        context.ui.toast.show({ title: "Sleep-time pass failed", message: brief.error ?? "unknown", variant: "error" })
        return
      }
      const choice = await context.ui.dialog.select({
        title: brief.status === "adopted" ? "☾ Brief (adopted)" : "☾ While you were away",
        options: [
          ...(brief.forkID ? [{ title: "Read", value: "read", description: `the brief and the work behind it (${brief.model})` }] : []),
          ...(brief.status === "ready"
            ? [{ title: "Adopt", value: "adopt", description: "attach to this session's instructions" }]
            : []),
          { title: "Dismiss", value: "dismiss" },
          ...(viewing(brief) ? [{ title: "Back", value: "back", description: "return to the session" }] : []),
        ],
      } as any)
      if (choice === "read" && brief.forkID) context.ui.router.navigate({ type: "session", sessionID: brief.forkID })
      if (choice === "adopt") await call("adopt", sessionID)
      if (choice === "dismiss") await call("dismiss", sessionID)
      if ((choice === "back" || ((choice === "adopt" || choice === "dismiss") && viewing(brief))))
        context.ui.router.navigate({ type: "session", sessionID })
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "dotagents.sleep.brief",
          title: "Sleep-time brief",
          group: "Session",
          palette: true,
          slash: { name: "brief", arguments: true },
          run: (input?: string) => {
            const id = current()
            if (id) void open(id, input)
          },
        },
      ],
    }))

    const label = (brief: Brief | null | undefined) => {
      if (brief?.status === "running") return "☾ dreaming…"
      if (brief?.status === "ready") return "☾ brief"
      if (brief?.status === "adopted") return "☾ adopted"
      return undefined
    }

    const slot = context.ui.slot({
      append: "prompt.footer.status",
      render: () => {
        const id = current()
        if (id && !(id in briefs())) load(id)
        const text = () => {
          const session = current()
          return session ? label(briefs()[session]) : undefined
        }
        const color = () =>
          briefs()[current() ?? ""]?.status === "ready" ? context.theme.text.feedback.success.base : context.theme.text.muted
        return (
          <Show when={text()}>
            {(value) => (
              <box flexShrink={0} onMouseUp={() => current() && void open(current()!)}>
                <text fg={color()} wrapMode="none">
                  {value()}
                </text>
              </box>
            )}
          </Show>
        )
      },
    } as any)

    return () => {
      stop.forEach((dispose) => dispose())
      ;(slot as any)?.()
    }
  },
})

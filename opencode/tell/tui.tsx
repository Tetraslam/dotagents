/** @jsxImportSource @opentui/solid */
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { createSignal, onMount, Show } from "solid-js"

// The approval half of tell's cosign. The server part asks permission for
// "tell.cosign" with the exact text in its metadata; this shows that text in
// full, in the TUI viewing the sender session, and answers only on an
// explicit y or n. Escape leaves the request pending (the built-in permission
// prompt stays below it); /cosign reopens it.

type Request = {
  id: string
  sessionID: string
  cosign: { from: string; to: string; handle: string; title: string; text: string }
}

// Keys pressed this soon after the dialog opens were typed before it was seen.
const ARM_MS = 800

export default Plugin.define({
  id: "dotagents.tell.tui",
  setup(context) {
    const [pending, setPending] = createSignal<Request[]>([])
    const opened = new Set<string>()
    const client: any = context.client

    const answer = async (request: Request, approve: boolean) => {
      setPending((list) => list.filter((item) => item.id !== request.id))
      const result = await client.permission
        .reply({ sessionID: request.sessionID, requestID: request.id, decision: approve ? "once" : "reject" })
        .catch((error: unknown) => ({ error }))
      context.ui.toast.show({
        message: result?.error
          ? `Cosign answer failed: ${String(result.error)}`
          : approve
            ? `Cosign approved: delivered to ${request.cosign.title}`
            : "Cosign rejected: nothing delivered",
        variant: result?.error ? "error" : approve ? "success" : "info",
      } as any)
    }

    const Approval = (props: { request: Request; close: () => void }) => {
      const plugin = usePlugin()
      const shown = Date.now()
      const { cosign } = props.request
      const rows = (plugin.renderer as any).height ?? 40
      const cols = (plugin.renderer as any).width ?? 100
      const estimate = cosign.text
        .split("\n")
        .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(20, Math.floor(cols * 0.4)))), 0)
      const height = Math.max(3, Math.min(estimate + 1, rows - 16))
      const act = (approve: boolean) => (_input?: unknown, event?: unknown) => {
        if (Date.now() - shown < ARM_MS) return event ? false : undefined
        props.close()
        void answer(props.request, approve)
      }
      plugin.keymap.layer(() => ({
        mode: "global",
        priority: 1000,
        commands: [
          { id: "tell.cosign.approve", title: "Approve cosign", bind: "y", run: act(true) },
          { id: "tell.cosign.reject", title: "Reject cosign", bind: "n", run: act(false) },
        ],
        bindings: ["tell.cosign.approve", "tell.cosign.reject"],
      }))
      return (
        <box flexDirection="column" paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} gap={1}>
          <text fg={plugin.theme.text.base}>
            <b>Cosign: deliver this to "{cosign.title}" as your own message?</b>
          </text>
          <text fg={plugin.theme.text.base} wrapMode="word">
            Relayed by {cosign.from}. Recipient: {cosign.title} ({cosign.handle}, {cosign.to}). It arrives as a user
            prompt, exactly as below:
          </text>
          <scrollbox height={height} focused>
            <text fg={plugin.theme.text.base} wrapMode="word">
              {cosign.text}
            </text>
          </scrollbox>
          <text fg={plugin.theme.text.base}>
            <b>y</b> approve and deliver · <b>n</b> reject · ↑↓ scroll · esc decide later (/cosign)
          </text>
        </box>
      )
    }

    const open = (request: Request) => {
      opened.add(request.id)
      context.ui.dialog.set({ size: "large" } as any)
      context.ui.dialog.show(() => <Approval request={request} close={() => context.ui.dialog.clear()} />)
    }

    const viewing = (sessionID: string) => {
      const route: any = context.ui.router.current()
      return route?.type === "session" && route.sessionID === sessionID
    }

    const stopAsked = context.data.on("permission.asked", (event: any) => {
      const data = event.data
      if (data?.action !== "tell.cosign" || !data.metadata?.cosign) return
      if (pending().some((item) => item.id === data.id)) return
      const request: Request = { id: data.id, sessionID: data.sessionID, cosign: data.metadata.cosign }
      setPending((list) => [...list, request])
      if (viewing(request.sessionID)) open(request)
    })
    const stopReplied = context.data.on("permission.replied", (event: any) => {
      setPending((list) => list.filter((item) => item.id !== event.data?.requestID))
    })

    // Opens a cosign when the user arrives at the session that asked for it.
    context.ui.slot({
      append: "session.composer.top",
      render: (props: any) => {
        const first = () => pending().find((item) => item.sessionID === props.sessionID && !opened.has(item.id))
        return (
          <Show when={first()}>
            {(request: any) => {
              onMount(() => open(request()))
              return null
            }}
          </Show>
        )
      },
    } as any)

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "tell.cosign.review",
          title: "Review pending cosign",
          group: "Tell",
          palette: true,
          slash: { name: "cosign" },
          run: () => {
            const route: any = context.ui.router.current()
            const request = pending().find((item) => item.sessionID === route?.sessionID) ?? pending()[0]
            if (request) open(request)
            else context.ui.toast.show({ message: "No cosign is waiting." } as any)
          },
        },
      ],
    }))

    return () => {
      stopAsked()
      stopReplied()
    }
  },
})

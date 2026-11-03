import { Rpc } from "@opencode/plugin/rpc"

const session = {
  type: "object",
  properties: { sessionID: { type: "string" } },
  required: ["sessionID"],
  additionalProperties: false,
} as const

// A Session's latest sleep-time pass, or null when it has none.
export type Brief = {
  status: "running" | "ready" | "empty" | "failed" | "adopted"
  forkID?: string
  model?: string
  brief?: string
  error?: string
  basedOn: string
  startedAt: number
  finishedAt?: number
}

export const Sleep = Rpc.define({
  id: "dotagents.sleep",
  methods: {
    get: { input: session, output: {} },
    run: { input: session, output: {} },
    adopt: { input: session, output: {} },
    dismiss: { input: session, output: {} },
  },
  events: {
    changed: {
      schema: {
        type: "object",
        properties: { sessionID: { type: "string" }, brief: {} },
        required: ["sessionID"],
        additionalProperties: false,
      },
    },
  },
})

import { Rpc } from "@opencode/plugin/rpc"

// The contract between tell's server part, which waits on a cosign, and its
// TUI part, which shows it to the user and answers.

const request = {
  type: "object",
  properties: {
    id: { type: "string" },
    sessionID: { type: "string" },
    rootID: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    handle: { type: "string" },
    title: { type: "string" },
    text: { type: "string" },
    asked: { type: "number" },
  },
  required: ["id", "sessionID", "rootID", "from", "to", "handle", "title", "text", "asked"],
  additionalProperties: false,
} as const

export const Tell = Rpc.define({
  id: "dotagents.tell",
  methods: {
    pending: {
      input: { type: "object", additionalProperties: false },
      output: { type: "object", properties: { requests: { type: "array", items: request } }, required: ["requests"] },
    },
    answer: {
      input: {
        type: "object",
        properties: { id: { type: "string" }, approve: { type: "boolean" } },
        required: ["id", "approve"],
        additionalProperties: false,
      },
      output: { type: "object", properties: { accepted: { type: "boolean" } }, required: ["accepted"] },
    },
  },
  events: {
    asked: { schema: request },
    settled: {
      schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
    },
  },
})

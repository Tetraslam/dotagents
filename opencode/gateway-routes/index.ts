import { Plugin } from "@opencode/plugin"

// Routes agents through a private model gateway (such as a tailnet-only LiteLLM
// proxy) whenever it is reachable, and to a fallback model when it is not.
//
// Options:
//   health    unauthenticated URL that returns 2xx when the gateway is up
//   agents    { "<agent id>": { "gateway": "<model>", "fallback": "<model>" } }
//   interval  probe period in milliseconds (default 60000)
//
// Agent transforms run before configuration is merged, so this only sees
// built-in agents (explore, general, title, ...), and an agent's `model` in
// opencode.json or an agent file overrides the choice made here. Leave
// `model` unset for every agent listed in `agents`.

type Route = { gateway: string; fallback: string }

type Options = {
  health?: string
  agents?: Record<string, Route>
  interval?: number
}

function ref(model: string) {
  const [path, variant] = model.split("#")
  const slash = path.indexOf("/")
  return {
    providerID: path.slice(0, slash),
    id: path.slice(slash + 1),
    ...(variant ? { variant } : {}),
  }
}

export default Plugin.define({
  id: "dotagents.gateway-routes",
  async setup(ctx) {
    const options = (ctx.options ?? {}) as Options
    const health = options.health
    if (!health) return
    const agents = options.agents ?? {}

    const probe = async () => {
      try {
        const response = await fetch(health, { signal: AbortSignal.timeout(3_000) })
        return response.ok
      } catch {
        return false
      }
    }

    let up = await probe()

    await ctx.agent.transform((editor) => {
      for (const [id, route] of Object.entries(agents)) {
        if (!editor.get(id)) continue
        editor.update(id, (agent) => {
          agent.model = ref(up ? route.gateway : route.fallback)
        })
      }
    })

    const timer = setInterval(() => {
      void probe().then(async (now) => {
        if (now === up) return
        up = now
        await ctx.agent.reload()
      })
    }, options.interval ?? 60_000)

    return () => clearInterval(timer)
  },
})

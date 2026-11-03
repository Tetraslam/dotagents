import { Plugin } from "@opencode/plugin"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// Puts mise's shims first on every agent shell's PATH, so per-directory tool
// pins (mise.toml, .tool-versions) apply to each command, including after a
// `cd`. `mise activate` in an interactive rc pins install directories for the
// directory the shell started in and only refreshes on a prompt, which agent
// shells never show, so the export goes in front of the command itself.
export default Plugin.define({
  id: "dotagents.mise-shims",
  async setup(ctx) {
    const data = process.env.MISE_DATA_DIR ?? join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "mise")
    const shims = join(data, "shims")
    if (!existsSync(shims)) return
    await ctx.shell.hook("create.before", (event) => {
      if (!/(^|\/)(ba|z|da)?sh$/.test(event.shell)) return
      event.command = `export PATH="${shims}:$PATH"\n${event.command}`
    })
  },
})

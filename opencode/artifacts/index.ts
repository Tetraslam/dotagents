import { Plugin } from "@opencode/plugin"

// Publishes OpenCode artifacts to a Zipline instance as single self-contained
// HTML pages. Zipline stores one file per upload, so other files in an
// artifact are inlined into the entry as data URIs, and a Markdown entry is
// wrapped in a small viewer. Updates delete and re-upload under the same name,
// so links stay stable.
//
// Zipline serves uploads with `Content-Security-Policy: sandbox`, which blocks
// scripts. Serve `<url>/a/<name>` from Zipline's `/raw/<name>` with
// `sandbox allow-scripts` (and without allow-same-origin) in front of it; see
// the dotagents README.
//
// Options:
//   url    Zipline origin, such as https://i.example.com
//   token  Zipline API token
//   path   public path prefix for pages (default "/a/")

type Options = { url?: string; token?: string; path?: string }
type Stored = { fileID: string; name: string; files: { [path: string]: string } }

const decoder = new TextDecoder()

const base64 = (bytes: Uint8Array) => {
  let binary = ""
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}
const unbase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0))

const MIME: { [extension: string]: string } = {
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  json: "application/json",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  woff2: "font/woff2",
  csv: "text/csv",
  txt: "text/plain",
}
const mime = (path: string) => MIME[path.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream"

const escape = (text: string) =>
  text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!)

function markdown(title: string, source: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
:root { color-scheme: light dark; }
body { max-width: 46rem; margin: 3rem auto; padding: 0 1.25rem; font: 16px/1.6 system-ui, sans-serif; }
pre { overflow-x: auto; padding: 1rem; border-radius: 8px; background: color-mix(in srgb, currentColor 7%, transparent); }
code { font-family: ui-monospace, monospace; font-size: .92em; }
table { border-collapse: collapse; } th, td { border: 1px solid color-mix(in srgb, currentColor 25%, transparent); padding: .35rem .7rem; }
img { max-width: 100%; }
</style></head>
<body><main id="content"></main>
<script type="text/markdown" id="source">${source.replace(/<\/script/gi, "<\\/script")}</script>
<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>
<script>document.getElementById("content").innerHTML = marked.parse(document.getElementById("source").textContent)</script>
</body></html>`
}

// Inline every artifact file the entry references by relative path.
function bundle(title: string, entry: string, files: Readonly<{ [path: string]: Uint8Array }>) {
  const source = decoder.decode(files[entry])
  if (/\.(md|markdown)$/i.test(entry)) return markdown(title, source)
  const dir = entry.includes("/") ? entry.slice(0, entry.lastIndexOf("/") + 1) : ""
  const resolve = (ref: string) => {
    const clean = ref.replace(/^\.\//, "").split(/[?#]/)[0]
    for (const candidate of [dir + clean, clean]) if (candidate !== entry && files[candidate]) return candidate
  }
  return source
    .replace(/<script([^>]*?)\ssrc=["']([^"']+)["']([^>]*)><\/script>/gi, (match, before, ref, after) => {
      const path = resolve(ref)
      if (!path) return match
      return `<script${before}${after}>${decoder.decode(files[path]).replace(/<\/script/gi, "<\\/script")}</script>`
    })
    .replace(/<link([^>]*?)\shref=["']([^"']+\.css)["']([^>]*)>/gi, (match, before, ref, after) => {
      const path = resolve(ref)
      if (!path || !/stylesheet/i.test(before + after)) return match
      return `<style>${decoder.decode(files[path])}</style>`
    })
    .replace(/(\s(?:src|href|poster)=["'])([^"']+)(["'])/gi, (match, open, ref, close) => {
      const path = resolve(ref)
      return path ? `${open}data:${mime(path)};base64,${base64(files[path])}${close}` : match
    })
}

export default Plugin.define({
  id: "dotagents.artifacts",
  async setup(ctx) {
    const options = (ctx.options ?? {}) as Options
    const origin = options.url?.replace(/\/+$/, "")
    const token = options.token
    if (!origin || !token) return
    const prefix = options.path ?? "/a/"

    const zipline = async (method: string, path: string, init: RequestInit = {}, signal?: AbortSignal) => {
      const response = await fetch(origin + path, {
        ...init,
        method,
        signal,
        headers: { authorization: token, ...(init.headers ?? {}) },
      })
      if (!response.ok) throw new Error(`Zipline ${method} ${path}: ${response.status} ${await response.text()}`)
      return response
    }

    const upload = async (name: string, html: string, signal: AbortSignal) => {
      const form = new FormData()
      form.append("file", new Blob([html], { type: "text/html" }), `${name}.html`)
      const response = await zipline(
        "POST",
        "/api/upload",
        { body: form, headers: { "x-zipline-filename": name, "x-zipline-deletes-at": "never" } },
        signal,
      )
      const file = (await response.json()).files[0]
      return { fileID: String(file.id), name: String(file.name) }
    }

    const remove = (fileID: string, signal?: AbortSignal) =>
      zipline("DELETE", `/api/user/files/${fileID}`, {}, signal).catch(() => undefined)

    const key = (id: string) => "artifact:" + id
    const load = async (id: string) => {
      const record = (await ctx.storage.get(key(id))) as Stored | undefined
      if (!record) throw new Error(`Unknown artifact ${id}`)
      return record
    }
    const store = (id: string, file: { fileID: string; name: string }, files: Readonly<{ [path: string]: Uint8Array }>) =>
      ctx.storage.set(key(id), {
        ...file,
        files: Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, base64(bytes)])),
      })

    await ctx.experimental.artifact.transform((editor) => {
      editor.add({
        id: "zipline",
        name: "Zipline",
        capabilities: ["static"],
        prompt:
          `Artifacts are published as one public web page at ${origin}${prefix}<name>: anyone with the link can open it, so do not publish secrets or private data unless the user asks. ` +
          "Other files in the artifact are inlined into the entry page, and a Markdown entry is rendered with a simple viewer. " +
          "Scripts run in a sandbox with no cookies, localStorage, or same-origin access; load libraries from a CDN or inline them. " +
          "Give the user the link after publishing.",
        create: async (input, { signal }) => {
          const name = input.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")
          const file = await upload(name, bundle(input.title, input.entry, input.files), signal)
          await store(input.id, file, input.files)
          return { url: `${origin}${prefix}${file.name}` }
        },
        read: async (id) => {
          const record = await load(id)
          return Object.fromEntries(Object.entries(record.files).map(([path, text]) => [path, unbase64(text)]))
        },
        update: async (id, input, { signal }) => {
          const record = await load(id)
          await remove(record.fileID, signal)
          const file = await upload(record.name.replace(/\.html$/, ""), bundle(input.title, input.entry, input.files), signal)
          await store(id, file, input.files)
          return { url: `${origin}${prefix}${file.name}` }
        },
        delete: async (id, { signal }) => {
          const record = (await ctx.storage.get(key(id))) as Stored | undefined
          if (record) await remove(record.fileID, signal)
          await ctx.storage.remove(key(id))
        },
      })
      editor.default.set("zipline")
    })
  },
})


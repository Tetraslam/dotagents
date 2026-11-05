import { Plugin } from "@opencode/plugin"
import { execFile } from "node:child_process"

// Two tools for the pull-request loop, over the GitHub CLI (`gh`):
//
//   pr_wait         blocks until every check on the PR's current head has
//                   finished (ignoring human-approval checks such as Owners),
//                   or the PR is merged or closed, then reports failures,
//                   checks that passed only by skipping, and unresolved review
//                   threads. A new push restarts the wait on the new head.
//   review_threads  lists unresolved review threads, or replies to and
//                   resolves a batch of them, confirming each resolution.
//
// Options:
//   ignore   regex source for check names to ignore. Default "^owners$".
//   require  { "<owner>/<repo>": ["Check name", ...] }: checks that must
//            appear on the head before it can count as finished, so a PR
//            whose reviewer check has not been created yet is not reported
//            done. Example: { "aire-dot-ai/core": ["Devin Review"] }.

type Options = { ignore?: string; require?: Record<string, string[]> }
type Check = { name: string; state: string; bucket: string; description: string; link: string; workflow: string }
type Thread = {
  id: string
  isResolved: boolean
  isOutdated: boolean
  path: string | null
  line: number | null
  comments: { nodes: { author: { login: string } | null; body: string; url: string }[] }
}

// `gh pr checks` exits 8 while checks are pending and 1 when one failed, even
// with --json; `lenient` keeps its JSON output whatever the exit code.
const run = (args: string[], cwd: string | undefined, signal?: AbortSignal, lenient = false) =>
  new Promise<string>((resolve, reject) => {
    execFile("gh", args, { cwd, signal, maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (!error || (lenient && stdout.trim().startsWith("["))) resolve(stdout)
      else reject(new Error(`gh ${args.slice(0, 3).join(" ")} failed: ${(stderr || error.message).trim()}`))
    })
  })

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new Error("Cancelled."))
    }, { once: true })
  })

// Strip review-bot markup: HTML comments, badge blocks, images, and the
// "Was this helpful?" footer, so the text is what a reviewer would read.
const clean = (body: string) =>
  body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<a [^>]*>\s*<picture>[\s\S]*?<\/picture>\s*<\/a>/g, "")
    .replace(/<\/?(details|summary|picture|source|img)[^>]*>/g, "")
    .replace(/---\s*\n\*Was this helpful\?[^\n]*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

const TERMINAL = new Set(["pass", "fail", "skipping", "cancel"])

export default Plugin.define({
  id: "dotagents.pr",
  async setup(ctx) {
    const options = (ctx.options ?? {}) as Options
    const ignore = new RegExp(options.ignore ?? "^owners$", "i")

    // The session's directory, so `gh` can infer the repository from it.
    const directoryOf = async (sessionID: string) => {
      try {
        const info: any = await ctx.session.get({ sessionID } as any)
        return info?.location?.directory as string | undefined
      } catch {
        return undefined
      }
    }

    // Accepts a PR URL, "owner/repo#123", or a number with the repository
    // given separately or inferred from the session's directory.
    const target = async (input: any, sessionID: string, signal?: AbortSignal) => {
      const raw = String(input.pr).trim()
      const url = raw.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/)
      const short = raw.match(/^([^/\s]+\/[^#\s]+)#(\d+)$/)
      const number = url?.[2] ?? short?.[2] ?? raw.replace(/^#/, "")
      if (!/^\d+$/.test(number)) throw new Error(`Not a pull request: "${raw}".`)
      let repo: string | undefined = url?.[1] ?? short?.[1] ?? input.repo
      const cwd = await directoryOf(sessionID)
      if (!repo) {
        const view = JSON.parse(await run(["repo", "view", "--json", "nameWithOwner"], cwd, signal))
        repo = view.nameWithOwner as string
      }
      return { repo, number: Number(number), cwd }
    }

    const threads = async (repo: string, number: number, cwd?: string, signal?: AbortSignal) => {
      const [owner, name] = repo.split("/")
      const query =
        "query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){nodes{id isResolved isOutdated path line comments(first:50){nodes{author{login} body url}}}}}}}"
      const out = JSON.parse(
        await run(["api", "graphql", "-f", `query=${query}`, "-F", `owner=${owner}`, "-F", `name=${name}`, "-F", `number=${number}`], cwd, signal),
      )
      return out.data.repository.pullRequest.reviewThreads.nodes as Thread[]
    }

    const describe = (thread: Thread) => {
      const [first, ...rest] = thread.comments.nodes
      const where = thread.path ? `${thread.path}${thread.line ? `:${thread.line}` : ""}` : "(conversation)"
      return (
        `${thread.id}  ${where}${thread.isOutdated ? "  [outdated]" : ""}\n` +
        `${first?.author?.login ?? "unknown"}: ${clean(first?.body ?? "")}\n` +
        (rest.length ? `(${rest.length} ${rest.length === 1 ? "reply" : "replies"}, last by ${rest.at(-1)?.author?.login ?? "unknown"})\n` : "") +
        (first?.url ? `${first.url}\n` : "")
      )
    }

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "pr_wait",
        description:
          "Wait for a GitHub pull request's checks to finish, then report. Blocks until every check on the current head has a final state (human-approval checks such as Owners are ignored), or the PR is merged or closed, or the timeout passes. A new push restarts the wait on the new head. Reports failed checks with their descriptions and links, checks that passed only by skipping (a reviewer that skipped did not review), and unresolved review threads. Use it after pushing instead of polling or a watcher.",
        input: {
          type: "object",
          properties: {
            pr: { type: "string", description: 'PR URL, "owner/repo#123", or a number.' },
            repo: { type: "string", description: '"owner/repo" when pr is a number; defaults to the repo of the session directory.' },
            timeoutMinutes: { type: "number", description: "Default 45." },
            require: {
              type: "array",
              items: { type: "string" },
              description: "Check names that must appear before the head counts as finished. Defaults to the plugin's per-repo list.",
            },
          },
          required: ["pr"],
          additionalProperties: false,
        },
        execute: async (input: any, context: any) => {
          const signal: AbortSignal | undefined = context.signal
          const { repo, number, cwd } = await target(input, context.sessionID, signal)
          const require: string[] = input.require ?? options.require?.[repo] ?? []
          const deadline = Date.now() + (Number(input.timeoutMinutes) || 45) * 60_000
          const started = Date.now()
          let head = ""
          let headSince = Date.now()

          for (;;) {
            const pr = JSON.parse(
              await run(["pr", "view", String(number), "--repo", repo, "--json", "state,headRefOid,mergeStateStatus,mergeCommit,url,title"], cwd, signal),
            )
            if (pr.headRefOid !== head) {
              head = pr.headRefOid
              headSince = Date.now()
            }
            let checks: Check[] = []
            try {
              checks = JSON.parse(
                await run(["pr", "checks", String(number), "--repo", repo, "--json", "name,state,bucket,description,link,workflow"], cwd, signal, true),
              )
            } catch (error) {
              // gh exits non-zero when a PR has no checks yet; treat as none.
              if (!String(error).includes("no checks")) throw error
            }
            const relevant = checks.filter((check) => !ignore.test(check.name))
            const pending = relevant.filter((check) => !TERMINAL.has(check.bucket))
            const missing = require.filter((name) => !relevant.some((check) => check.name === name))
            const closed = pr.state !== "OPEN"
            // A head with no checks yet may simply not have been picked up; give CI two minutes to start.
            const settled = relevant.length > 0 || Date.now() - headSince > 120_000
            const done = closed || (pending.length === 0 && missing.length === 0 && settled)
            const timedOut = Date.now() > deadline

            if (done || timedOut) {
              const failed = relevant.filter((check) => check.bucket === "fail" || check.bucket === "cancel")
              // A check whose description says it skipped (a reviewer that did not review) matters;
              // CI jobs skipped by their conditions, with no description, are routine and only counted.
              const skipped = relevant.filter((check) => /\bskipp?(ed|ing)\b/i.test(check.description ?? ""))
              const routine = relevant.filter((check) => check.bucket === "skipping" && !skipped.includes(check)).length
              const open = (await threads(repo, number, cwd, signal)).filter((thread) => !thread.isResolved)
              const minutes = Math.round((Date.now() - started) / 60_000)
              const status = closed
                ? pr.state === "MERGED"
                  ? `merged${pr.mergeCommit?.oid ? ` as ${pr.mergeCommit.oid.slice(0, 10)}` : ""}`
                  : "closed"
                : timedOut
                  ? "timed out"
                  : failed.length
                    ? "finished with failures"
                    : "finished, all passing"
              const passed = relevant.filter((check) => check.bucket === "pass").length
              const lines = [
                `${repo}#${number} ${status} after ${minutes}m. Head ${head.slice(0, 10)}, merge state ${pr.mergeStateStatus}. ${passed} checks passed, ${routine} skipped by their conditions.`,
                `${pr.title}\n${pr.url}`,
              ]
              if (timedOut && !done)
                lines.push(
                  `Still waiting on: ${[...pending.map((check) => `${check.name} (${check.state})`), ...missing.map((name) => `${name} (not created yet)`)].join(", ")}.`,
                )
              if (failed.length)
                lines.push(`Failed:\n${failed.map((check) => `- ${check.name}: ${check.description || check.state} ${check.link}`).join("\n")}`)
              if (skipped.length)
                lines.push(
                  `Skipped, by their own description (a reviewer that skipped did not review):\n${skipped.map((check) => `- ${check.name}: ${check.description || check.state}`).join("\n")}`,
                )
              lines.push(
                open.length
                  ? `Unresolved review threads (${open.length}):\n\n${open.map(describe).join("\n")}`
                  : "No unresolved review threads.",
              )
              return { content: lines.join("\n\n") }
            }

            await context.progress?.({
              status: `waiting on ${pending.length} check${pending.length === 1 ? "" : "s"}${missing.length ? ` and ${missing.join(", ")}` : ""}`,
            })
            await sleep(30_000, signal)
          }
        },
      } as any)

      editor.add({
        name: "review_threads",
        description:
          "List a GitHub pull request's unresolved review threads, or reply to and resolve them. With no `resolve`, lists unresolved threads (ID, file:line, cleaned text). With `resolve`, replies to each thread when a reply is given, resolves it, and confirms it is resolved. Fix valid feedback before resolving; irrelevant feedback may be resolved without a reply.",
        input: {
          type: "object",
          properties: {
            pr: { type: "string", description: 'PR URL, "owner/repo#123", or a number.' },
            repo: { type: "string", description: '"owner/repo" when pr is a number; defaults to the repo of the session directory.' },
            all: { type: "boolean", description: "When listing, include resolved threads too." },
            resolve: {
              type: "array",
              description: "Threads to resolve, by ID from the listing.",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  reply: { type: "string", description: "Posted as a reply before resolving. Omit to resolve silently." },
                },
                required: ["id"],
                additionalProperties: false,
              },
            },
          },
          required: ["pr"],
          additionalProperties: false,
        },
        execute: async (input: any, context: any) => {
          const signal: AbortSignal | undefined = context.signal
          const { repo, number, cwd } = await target(input, context.sessionID, signal)
          const items: { id: string; reply?: string }[] = input.resolve ?? []

          if (!items.length) {
            const all = await threads(repo, number, cwd, signal)
            const shown = input.all ? all : all.filter((thread) => !thread.isResolved)
            if (!shown.length) return { content: `${repo}#${number}: no ${input.all ? "" : "unresolved "}review threads.` }
            return {
              content: `${repo}#${number}: ${shown.length} ${input.all ? "" : "unresolved "}thread${shown.length === 1 ? "" : "s"}.\n\n${shown
                .map((thread) => (input.all ? `${thread.isResolved ? "[resolved] " : "[open] "}` : "") + describe(thread))
                .join("\n")}`,
            }
          }

          const results: string[] = []
          for (const item of items) {
            try {
              if (item.reply)
                await run(
                  [
                    "api", "graphql",
                    "-f", "query=mutation($t:ID!,$b:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$t,body:$b}){comment{id}}}",
                    "-f", `t=${item.id}`,
                    "-f", `b=${item.reply}`,
                  ],
                  cwd,
                  signal,
                )
              const out = JSON.parse(
                await run(
                  ["api", "graphql", "-f", "query=mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{isResolved}}}", "-f", `t=${item.id}`],
                  cwd,
                  signal,
                ),
              )
              const resolved = out?.data?.resolveReviewThread?.thread?.isResolved === true
              results.push(`${item.id}: ${item.reply ? "replied, " : ""}${resolved ? "resolved" : "NOT resolved"}`)
            } catch (error) {
              results.push(`${item.id}: failed: ${error instanceof Error ? error.message : String(error)}`)
            }
          }
          const remaining = (await threads(repo, number, cwd, signal)).filter((thread) => !thread.isResolved).length
          return { content: `${results.join("\n")}\n\n${remaining} unresolved thread${remaining === 1 ? "" : "s"} left on ${repo}#${number}.` }
        },
      } as any)
    })
  },
})

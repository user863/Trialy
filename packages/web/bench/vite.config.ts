import { defineConfig, type Plugin } from "vite"
import { createReadStream, existsSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

const dataDir = resolve(process.env.BENCH_DATA ?? "../pipeline/.cache/poc/covered")
const kbps = Number(process.env.BENCH_KBPS ?? 0)
const rttMs = Number(process.env.BENCH_RTT_MS ?? 0)

const dataServer = (): Plugin => ({
  name: "bench-data",
  configureServer(server) {
    server.middlewares.use("/bench-data", (req, res) => {
      const name = decodeURIComponent((req.url ?? "").slice(1).split("?")[0]!)
      const variants: Array<[string, string, string]> = [
        [`${name}.br`, "br", "application/json"],
        [`${name}.gz`, "gzip", "application/json"],
        [name, "", "application/json"]
      ]
      const want = String(req.headers["accept-encoding"] ?? "")
      const hit = variants.find(([f, enc]) => existsSync(join(dataDir, f)) && (enc === "" || want.includes(enc)) && statSync(join(dataDir, f)).isFile())
      if (!hit || name.includes("..")) {
        res.statusCode = 404
        res.end()
        return
      }
      const [file, enc, type] = hit
      const path = join(dataDir, file)
      res.setHeader("content-type", type)
      res.setHeader("cache-control", "no-store")
      if (enc) res.setHeader("content-encoding", enc)
      res.setHeader("content-length", statSync(path).size)
      const stream = createReadStream(path, { highWaterMark: kbps ? Math.max(1024, Math.round((kbps * 1024) / 8 / 20)) : 65536 })
      setTimeout(() => {
        if (!kbps) return void stream.pipe(res)
        stream.on("data", (chunk) => {
          stream.pause()
          res.write(chunk, () => setTimeout(() => stream.resume(), 50))
        })
        stream.on("end", () => res.end())
      }, rttMs)
    })
  }
})

export default defineConfig({
  root: resolve(import.meta.dirname),
  plugins: [dataServer()],
  worker: { format: "es" },
  server: { host: "127.0.0.1", port: 5199, fs: { strict: false } },
  resolve: { dedupe: ["effect"] }
})

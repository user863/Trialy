import { chromium } from "playwright-core"
import { createServer } from "vite"
import { resolve } from "node:path"
import { writeFileSync } from "node:fs"

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}

const dataDir = resolve(arg("data", "../pipeline/.cache/poc/covered"))
const file = arg("file", "all.json")
const mode = arg("mode", "main")
const reps = Number(arg("reps", 5))
const out = arg("out")
process.env.BENCH_DATA = dataDir

const server = await createServer({ configFile: resolve(import.meta.dirname, "vite.config.ts"), logLevel: "error" })
await server.listen()

const PROFILES = {
  desktop: { cpu: 1, net: null },
  "phone-fast4g": { cpu: 4, net: { latency: 170, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 } },
  "phone-slow4g": { cpu: 4, net: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } }
}
const only = arg("profiles")?.split(",")

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] })
const results = {}
for (const [name, p] of Object.entries(PROFILES)) {
  if (only && !only.includes(name)) continue
  const runs = []
  for (let i = 0; i < reps; i++) {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.cpu })
    if (p.net) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...p.net })
    await page.goto(`http://127.0.0.1:5199/index.html?file=${file}&mode=${mode}&runs=5&i=${i}`)
    await page.waitForFunction(() => window.__bench, null, { timeout: 600000 })
    runs.push(await page.evaluate(() => window.__bench))
    await ctx.close()
  }
  const pick = (k) => Math.round(median(runs.map((r) => r[k])))
  results[name] = {
    cpuSlowdown: p.cpu,
    network: p.net ? `${Math.round((p.net.downloadThroughput * 8) / 1048576 * 10) / 10} Mbit/s, ${p.net.latency} ms RTT` : "none",
    reps,
    trials: runs[0].trials,
    fetchMs: pick("fetchMs"),
    parseMs: pick("parseMs"),
    buildMs: pick("buildMs"),
    cloneToWorkerMs: pick("cloneMs"),
    detailOpenMs: pick("detailOpenMs"),
    readyTotalMs: pick("loadTotalMs"),
    matchMedianMs: pick("matchMedianMs"),
    heapMB: pick("heapMB")
  }
  console.error(name, JSON.stringify(results[name]))
}
await browser.close()
await server.close()
if (out) writeFileSync(out, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))

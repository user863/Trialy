import { chromium } from "playwright-core"

const base = process.argv[2] ?? "http://127.0.0.1:5173/Trialy/"
const browser = await chromium.launch()
const page = await browser.newPage()
const requests = []
const errors = []
page.on("request", (r) => {
  const u = new URL(r.url())
  if (u.pathname.includes("/data/")) requests.push(u.pathname.split("/data/")[1])
})
page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
page.on("pageerror", (e) => errors.push(String(e)))

await page.goto(base)
await page.waitForSelector("h1")
await page.waitForTimeout(1500)
console.log("home requests:", requests.splice(0))

await page.goto(base + "#/results")
await page.waitForSelector(".trial-card", { timeout: 15000 })
console.log("results cards:", await page.locator(".trial-card").count(), "requests:", requests.splice(0))
const first = await page.locator(".trial-card .card-title a").first()
const title = await first.textContent()
await first.click()
await page.waitForSelector("text=Eligibility", { timeout: 15000 })
console.log("trial page:", title, "| requests:", requests.splice(0))
console.log("criteria rows:", await page.locator("section li").count(), "| site items:", await page.locator("ul.sites li").count())

await page.goto(base + "#/results")
await page.waitForSelector(".trial-card")
await page.selectOption("select >> nth=0", "NL").catch(() => undefined)
const country = page.locator('label:has-text("Country") select').first()
await country.selectOption("NL")
await page.fill('input[inputmode="numeric"]', "1012")
await page.waitForTimeout(800)
console.log("postcode status:", await page.locator(".where .meta").textContent())
console.log("first card meta:", await page.locator(".trial-card .meta").first().textContent())
console.log("errors:", errors)
await browser.close()

import { describe, expect, it } from "vitest"
import { reminderCalendar } from "../src/ics"

describe("reminder calendar", () => {
  const now = new Date("2026-11-04T14:52:00.000Z")
  const lines = reminderCalendar(now, 3).split("\r\n")

  it("is stamped from the clock it is given", () => {
    expect(lines).toContain("DTSTAMP:20261104T145200Z")
    expect(lines).toContain(`UID:${now.getTime()}@trial-finder.local`)
  })

  it("starts the reminder the chosen number of months later", () => {
    expect(lines).toContain("DTSTART;VALUE=DATE:20270204")
  })

  it("does not change the date it was given", () => {
    expect(now.toISOString()).toBe("2026-11-04T14:52:00.000Z")
  })

  it("is a complete calendar file", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR")
    expect(lines.at(-1)).toBe("END:VCALENDAR")
  })
})

export const reminderCalendar = (now: Date, months: number): string => {
  const due = new Date(now)
  due.setMonth(due.getMonth() + months)
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TrialBase prototype//EN",
    "BEGIN:VEVENT",
    `UID:${now.getTime()}@trial-finder.local`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${due.toISOString().slice(0, 10).replace(/-/g, "")}`,
    "SUMMARY:Check again for clinical trials",
    "DESCRIPTION:Open TrialBase, update anything that changed (new scan, new treatment, new test result) and see what is new.",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n")
}

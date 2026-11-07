const escapeText = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n")

export const reminderCalendar = (now: Date, months: number, text: { summary: string; description: string }): string => {
  const due = new Date(now)
  due.setMonth(due.getMonth() + months)
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Trialy prototype//EN",
    "BEGIN:VEVENT",
    `UID:${now.getTime()}@trialy.local`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${due.toISOString().slice(0, 10).replace(/-/g, "")}`,
    `SUMMARY:${escapeText(text.summary)}`,
    `DESCRIPTION:${escapeText(text.description)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n")
}

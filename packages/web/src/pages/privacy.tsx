import { useState } from "react"
import { type Profile } from "@trial-finder/domain"
import { useApp } from "../app"
import { decryptJson, encryptJson } from "../crypto"
import { useI18n } from "../i18n"
import { Support, go } from "../ui"

export function Privacy() {
  const { t: tr, rich } = useI18n()
  const { profile, shortlist, replaceAll, wipe, index, group } = useApp()
  const [pass, setPass] = useState("")
  const [msg, setMsg] = useState("")
  const [confirmWipe, setConfirmWipe] = useState(false)
  const doExport = async () => {
    if (pass.length < 8) return setMsg(tr("privacy.shortPass"))
    const file = await encryptJson({ profile, shortlist, group }, pass)
    if (!file.ok) return setMsg(tr(`crypto.${file.error}`))
    const blob = new Blob([file.value], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "trialy-profile.trialy"
    a.click()
    setMsg(tr("privacy.exported"))
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    const opened = await decryptJson(await f.text(), pass)
    if (!opened.ok) return setMsg(tr(`crypto.${opened.error}`))
    const d = opened.value as { profile: Profile; shortlist?: string[]; group?: string }
    replaceAll(d.profile, d.shortlist ?? [], d.group)
    setMsg(tr("privacy.imported"))
  }
  return (
    <main className="page narrow">
      <h1>{tr("privacy.title")}</h1>
      <h2>{tr("privacy.stays.title")}</h2>
      <p>{tr("privacy.stays.text")}</p>
      <h2>{tr("privacy.server.title")}</h2>
      <p>{rich("privacy.server.text", { code: (text) => <code>{text}</code> }, { file: "index.json", trials: index ? tr("privacy.server.count", { count: index.trials.length }) : "", buckets: String(index?.bucketCount ?? "") })}</p>
      <h2>{tr("privacy.check.title")}</h2>
      <p>{rich("privacy.check.text", { em: (text) => <em>{text}</em> })}</p>
      <h2>{tr("privacy.move.title")}</h2>
      <p className="muted">{tr("privacy.move.text")}</p>
      <label className="field">
        <span>{tr("privacy.passphrase")}</span>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" />
      </label>
      <p className="actions">
        <button className="btn" onClick={doExport}>{tr("privacy.export")}</button>
        <label className="btn">
          {tr("privacy.import")}
          <input type="file" accept=".trialy,.tfprofile,application/json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
        </label>
      </p>
      <p aria-live="polite" className="muted">{msg}</p>
      <h2>{tr("privacy.delete.title")}</h2>
      <p>{tr("privacy.delete.text")}</p>
      {confirmWipe ? (
        <p className="actions">
          <button className="btn danger" onClick={async () => {
            const wiped = await wipe()
            setConfirmWipe(false)
            if (!wiped.ok) return setMsg(tr(`wipe.${wiped.error}`))
            setMsg(tr("privacy.deleted"))
            go("/")
          }}>{tr("privacy.delete.confirm")}</button>
          <button className="btn" onClick={() => setConfirmWipe(false)}>{tr("privacy.cancel")}</button>
        </p>
      ) : (
        <button className="btn" onClick={() => setConfirmWipe(true)}>{tr("privacy.delete.title")}</button>
      )}
      <h2>{tr("privacy.funding.title")}</h2>
      <p>{tr("privacy.funding.text")}</p>
      <Support />
    </main>
  )
}

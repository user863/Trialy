import "@fontsource-variable/inter"
import { StrictMode, startTransition, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { AppProvider, useApp, useHashRoute } from "./app"
import { Finder } from "./finder"
import { Landing } from "./home"
import { Privacy, Results, Shortlist, Summary, TrialPage, Wizard } from "./pages"
import { LANGUAGES, I18nProvider, useI18n, type Language } from "./i18n"
import { Logo, RegistryEnglishNote } from "./ui"
import { pref } from "./store"
import "./styles.css"

type Theme = "light" | "dark"

const storedTheme = (): Theme => {
  const saved = pref.get("theme")
  if (saved === "dark" || saved === "light") return saved
  return saved === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

const applyTheme = (theme: Theme) => document.documentElement.classList.toggle("dark", theme === "dark")

const initialTheme = storedTheme()
applyTheme(initialTheme)

function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    pref.set("theme", theme)
  }, [theme])

  // read the live class, not state, so rapid clicks always flip
  const toggle = () => {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark"
    applyTheme(next)
    startTransition(() => setTheme(next))
  }
  return [theme, toggle] as const
}

const renderPage = ([section, id]: string[]) => {
  switch (section) {
    case "questions":
      return <Wizard stepId={id} />
    case "find":
      return <Finder />
    case "results":
      return <Results />
    case "trial":
      return id ? <TrialPage id={id} /> : <Landing />
    case "shortlist":
      return <Shortlist />
    case "summary":
      return <Summary />
    case "privacy":
      return <Privacy />
    default:
      return <Landing />
  }
}

function Shell() {
  const [route] = useHashRoute()
  const { shortlist, loaded, storageOk } = useApp()
  const [theme, toggleTheme] = useTheme()
  const { t, language, setLanguage } = useI18n()
  const parts = route.split("/").filter(Boolean)

  const links = [
    { section: "results", label: t("nav.trials") },
    { section: "questions", label: t("nav.answers") },
    { section: "shortlist", label: shortlist.length > 0 ? t("nav.shortlistCount", { count: shortlist.length }) : t("nav.shortlist") },
    { section: "privacy", label: t("nav.privacy") }
  ]

  return (
    <>
      <a className="skip" href="#main">{t("nav.skip")}</a>
      <header className="nav noprint">
        <div className="page nav-inner">
          <a href="#/" className="brand">
            <Logo />
            Trialy
          </a>
          <nav aria-label={t("nav.main")}>
            {links.map(({ section, label }) => (
              <a key={section} href={`#/${section}`} aria-current={parts[0] === section ? "page" : undefined}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <button className="icon-button" onClick={toggleTheme} title={t(theme === "dark" ? "theme.toLight" : "theme.toDark")} aria-label={t(theme === "dark" ? "theme.toLight" : "theme.toDark")}>
              ◐
            </button>
            <label className="lang">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
              </svg>
              <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} aria-label={t("language.label")}>
                {LANGUAGES.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </label>
            <a href="#/questions" className="btn primary small">{t("nav.start")}</a>
          </div>
        </div>
      </header>
      {!storageOk && (
        <p className="callout page noprint" role="status">
          {t("storage.warning")}
        </p>
      )}
      <div id="main">{loaded ? renderPage(parts) : <main className="page narrow"><p>{t("common.loading")}</p></main>}</div>
      <footer className="page noprint">
        <p>{t("footer.text")}</p>
        <RegistryEnglishNote />
      </footer>
    </>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </I18nProvider>
  </StrictMode>
)

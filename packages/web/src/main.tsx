import "@fontsource-variable/inter"
import { StrictMode, startTransition, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { AppProvider, useApp, useHashRoute } from "./app"
import { Finder } from "./finder"
import { Landing } from "./home"
import { Privacy, Results, Shortlist, Summary, TrialPage, Wizard } from "./pages"
import { Logo } from "./ui"
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

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" }
] as const

type Language = (typeof LANGUAGES)[number]["code"]

// placeholder: remembers the choice, but the interface is only written in English so far
function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => LANGUAGES.find((l) => l.code === pref.get("lang"))?.code ?? "en")
  const choose = (code: Language) => {
    setLanguage(code)
    pref.set("lang", code)
  }
  return [language, choose] as const
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
  const [language, chooseLanguage] = useLanguage()
  const parts = route.split("/").filter(Boolean)

  const links = [
    { section: "results", label: "Trials" },
    { section: "questions", label: "My answers" },
    { section: "shortlist", label: shortlist.length > 0 ? `Shortlist (${shortlist.length})` : "Shortlist" },
    { section: "privacy", label: "Privacy" }
  ]

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav noprint">
        <div className="page nav-inner">
          <a href="#/" className="brand">
            <Logo />
            Trialy
          </a>
          <nav aria-label="Main">
            {links.map(({ section, label }) => (
              <a key={section} href={`#/${section}`} aria-current={parts[0] === section ? "page" : undefined}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <button className="icon-button" onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              ◐
            </button>
            <label className="lang">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
              </svg>
              <select value={language} onChange={(e) => chooseLanguage(e.target.value as Language)} aria-label="Language">
                {LANGUAGES.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </label>
            <a href="#/questions" className="btn primary small">Start</a>
          </div>
        </div>
      </header>
      {!storageOk && (
        <p className="callout page noprint" role="status">
          Your answers cannot be saved in this browser, for example in a private window. They stay on this page and are lost when you close it.
        </p>
      )}
      <div id="main">{loaded ? renderPage(parts) : <main className="page narrow"><p>Loading…</p></main>}</div>
      <footer className="page noprint">
        <p>Information service about clinical trials, not medical advice. Always talk to your treating team. Data: ClinicalTrials.gov. Prototype, English only.</p>
      </footer>
    </>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <Shell />
    </AppProvider>
  </StrictMode>
)

import "@fontsource-variable/inter"
import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { AppProvider, useApp, useHashRoute } from "./app"
import { Finder } from "./finder"
import { Landing } from "./home"
import { Privacy, Results, Shortlist, Summary, TrialPage, Wizard } from "./pages"
import { Logo } from "./ui"
import { pref } from "./store"
import "./styles.css"

type Theme = "light" | "dark" | "system"

const NEXT_THEME: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" }
const THEME_LABEL: Record<Theme, string> = { light: "Light", dark: "Dark", system: "Automatic" }

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (pref.get("theme") as Theme | null) ?? "light")

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && query.matches))
    apply()
    query.addEventListener("change", apply)
    pref.set("theme", theme)
    return () => query.removeEventListener("change", apply)
  }, [theme])

  return [theme, () => setTheme((t) => NEXT_THEME[t])] as const
}

function useLargeText() {
  const [large, setLarge] = useState(() => pref.get("big") === "1")

  useEffect(() => {
    document.documentElement.classList.toggle("big", large)
    pref.set("big", large ? "1" : "0")
  }, [large])

  return [large, () => setLarge((v) => !v)] as const
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
  const { shortlist, loaded } = useApp()
  const [theme, cycleTheme] = useTheme()
  const [largeText, toggleLargeText] = useLargeText()
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
            TrialBase
          </a>
          <nav aria-label="Main">
            {links.map(({ section, label }) => (
              <a key={section} href={`#/${section}`} aria-current={parts[0] === section ? "page" : undefined}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <button className="icon-button" onClick={cycleTheme} title={`Theme: ${THEME_LABEL[theme]}`} aria-label={`Theme: ${THEME_LABEL[theme]}. Change theme`}>
              ◐
            </button>
            <button className="icon-button" onClick={toggleLargeText} aria-pressed={largeText} aria-label="Larger text">
              A+
            </button>
            <a href="#/questions" className="btn primary small">Start</a>
          </div>
        </div>
      </header>
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

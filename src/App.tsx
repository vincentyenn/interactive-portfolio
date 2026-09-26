import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import type { Focus } from './LoftScene'
import portfolio from '../content/portfolio.json'

const LoftScene = lazy(() => import('./LoftScene'))
type SectionFocus = Exclude<Focus, 'room'>

class SceneImportBoundary extends Component<{ children: ReactNode, onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

const sections: { id: SectionFocus, number: string, label: string, object: string }[] = [
  { id: 'computer', number: '01', label: 'Overview', object: 'The computer' },
  { id: 'projects', number: '02', label: 'Projects', object: 'The workbench' },
  { id: 'experience', number: '03', label: 'Experience', object: 'The wall' },
  { id: 'about', number: '04', label: 'About', object: 'The shelf' },
  { id: 'contact', number: '05', label: 'Contact', object: 'The doorway' },
]

type RouteState = { focus: Focus, selectedProject: number | null }

function routeFromHash(hash: string): RouteState {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (!parts.length || (parts.length === 1 && parts[0] === 'room')) return { focus: 'room', selectedProject: null }
  if (parts.length === 1 && parts[0] === 'overview') return { focus: 'computer', selectedProject: null }
  if (parts[0] === 'projects') {
    if (parts.length === 1) return { focus: 'projects', selectedProject: null }
    if (parts.length === 2) {
      const index = portfolio.projects.findIndex((project) => project.id === parts[1])
      if (index >= 0) return { focus: 'projects', selectedProject: index }
    }
    return { focus: 'room', selectedProject: null }
  }
  if (parts.length === 1 && (parts[0] === 'experience' || parts[0] === 'about' || parts[0] === 'contact')) {
    return { focus: parts[0], selectedProject: null }
  }
  return { focus: 'room', selectedProject: null }
}

function hashForRoute(route: RouteState): string {
  if (route.focus === 'room') return '#/room'
  if (route.focus === 'computer') return '#/overview'
  if (route.focus === 'projects') {
    const project = route.selectedProject === null ? null : portfolio.projects[route.selectedProject]
    return project ? `#/projects/${project.id}` : '#/projects'
  }
  return `#/${route.focus}`
}

function canUseWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const change = () => setMatches(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [query])
  return matches
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true" className="arrow">{diagonal ? '↗' : '→'}</span>
}

function FocusPanel({ focus, selectedProject, sceneAvailable, onNavigate, onBack, onBackToBlueprints }: {
  focus: Focus
  selectedProject: number | null
  sceneAvailable: boolean
  onNavigate: (route: RouteState) => void
  onBack: (from: SectionFocus) => void
  onBackToBlueprints: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const projectButtonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const lastProjectIndexRef = useRef<number | null>(null)

  useEffect(() => {
    if (selectedProject !== null) lastProjectIndexRef.current = selectedProject
    if (focus === 'room') return
    const frame = requestAnimationFrame(() => {
      if (focus === 'projects' && selectedProject === null && lastProjectIndexRef.current !== null) {
        const button = projectButtonsRef.current[lastProjectIndexRef.current]
        if (button) {
          button.focus({ preventScroll: true })
          return
        }
      }
      headingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [focus, selectedProject])

  const item = sections.find((section) => section.id === focus)
  if (!item) return null
  const project = selectedProject === null ? null : portfolio.projects[selectedProject]

  return <aside tabIndex={-1} className={`focus-panel focus-${focus}`} aria-label={`${item.label} details`}>
    <div className="panel-topline"><span>THE LOFT / {item.number}</span><span>{item.object}</span></div>
    <button className="back-link" onClick={() => onBack(item.id)} aria-label="Back to loft overview">← &nbsp; Back to the loft</button>
    {focus === 'computer' && <>
      <p className="eyebrow">At the computer</p>
      <h2 ref={headingRef} tabIndex={-1}>Hi, I’m<br className="short-screen-break" />{' '}<em>Vincent.</em></h2>
      <p className="panel-lead">{portfolio.summary}</p>
      <p className="panel-copy">{portfolio.education}</p>
      <div className="panel-divider" />
      <p className="panel-label">Choose where to go next</p>
      <div className="overview-destinations" role="group" aria-label="Portfolio destinations">
      {sections.slice(1).map((section) => <button className="panel-row" key={section.id}
        onClick={() => onNavigate({ focus: section.id, selectedProject: null })}>
        <span>{section.number} / {section.label}</span><Arrow />
      </button>)}
      </div>
    </>}
    {focus === 'projects' && selectedProject === null && <>
      <p className="eyebrow">Top view / workbench</p>
      <h2 ref={headingRef} tabIndex={-1}>Selected<br className="short-screen-break" />{' '}<em>work.</em></h2>
      <p className="panel-copy">{sceneAvailable ? 'Each blueprint is a project. Pick one on the table or from this list.' : 'Choose a project from the list below.'}</p>
      <div className="project-picker" role="group" aria-label="Select a project">
        {portfolio.projects.map((entry, index) => <button key={entry.id} className="project-choice"
          ref={(node) => { projectButtonsRef.current[index] = node }}
          onClick={() => onNavigate({ focus: 'projects', selectedProject: index })}>
          <span className="choice-number">0{index + 1}</span><span>{entry.title}<small>{entry.category}</small></span><Arrow />
        </button>)}
      </div>
    </>}
    {focus === 'projects' && project && <>
      <p className="eyebrow">Blueprint / 0{selectedProject! + 1}</p>
      <h2 ref={headingRef} tabIndex={-1} className="project-title">{project.title}</h2>
      <p className="panel-lead">{project.summary}</p>
      <div className="detail-meta"><span>{project.year} · {project.status}</span><span>{project.tools.join(' / ')}</span></div>
      {'repository' in project && project.repository && <a className="text-link" href={project.repository} target="_blank" rel="noreferrer">View repository <Arrow diagonal /></a>}
      <button className="back-link blueprint-back" onClick={onBackToBlueprints}>← &nbsp; Back to blueprints</button>
    </>}
    {focus === 'experience' && <>
      <p className="eyebrow">Pinned to the wall</p>
      <h2 ref={headingRef} tabIndex={-1}>My<br className="short-screen-break" />{' '}<em>experience.</em></h2>
      <div className="experience-list">{portfolio.experience.map((role) => <article key={role.company}>
        <span>{role.period}</span><h3>{role.company}</h3><p className="role">{role.role}</p><p>{role.summary}</p>
      </article>)}</div>
    </>}
    {focus === 'about' && <>
      <p className="eyebrow">The personal shelf</p>
      <h2 ref={headingRef} tabIndex={-1}>More than<br /><em>code.</em></h2>
      <p className="panel-lead">{portfolio.about}</p>
      <div className="interests"><span>Camcorder / storytelling</span><span>Football / sports</span><span>Headphones / music</span><span>Recipes / cooking</span></div>
    </>}
    {focus === 'contact' && <>
      <p className="eyebrow">The doorway</p>
      <h2 ref={headingRef} tabIndex={-1}>Let’s make<br /><em>something.</em></h2>
      <p className="panel-lead">I’m always interested in thoughtful work and good conversations.</p>
      <a className="contact-primary" href={portfolio.links.linkedin} target="_blank" rel="noreferrer">Connect on LinkedIn <Arrow diagonal /></a>
      <a className="panel-row" href={portfolio.links.github} target="_blank" rel="noreferrer"><span>Explore GitHub</span><Arrow diagonal /></a>
    </>}
  </aside>
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => {
    const initial = routeFromHash(window.location.hash)
    const canonical = hashForRoute(initial)
    const current = window.history.state as { loftRoute?: string } | null
    if (window.location.hash !== canonical || current?.loftRoute !== canonical) {
      window.history.replaceState({ loftRoute: canonical }, '', canonical)
    }
    return initial
  })
  const { focus, selectedProject } = route
  const [sceneReady, setSceneReady] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(() => !canUseWebGL() || new URLSearchParams(window.location.search).has('no3d'))
  const navButtonsRef = useRef<Partial<Record<SectionFocus, HTMLButtonElement | null>>>({})
  const roomNavRef = useRef<HTMLElement>(null)
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)')
  const mobile = useMedia('(max-width: 700px)')
  const onReady = useCallback(() => setSceneReady(true), [])
  const onError = useCallback(() => setSceneFailed(true), [])

  const navigate = useCallback((next: RouteState) => {
    const hash = hashForRoute(next)
    if (window.location.hash !== hash) {
      window.history.pushState({ loftRoute: hash, previousHash: window.location.hash || '#/room' }, '', hash)
    }
    setRoute(next)
    setMobileNavOpen(false)
  }, [])

  const onFocus = useCallback((next: Focus) => navigate({ focus: next, selectedProject: null }), [navigate])
  const onBack = useCallback((from: SectionFocus) => {
    navigate({ focus: 'room', selectedProject: null })
    requestAnimationFrame(() => navButtonsRef.current[from]?.focus({ preventScroll: true }))
  }, [navigate])
  const onProject = useCallback((index: number) => navigate({ focus: 'projects', selectedProject: index }), [navigate])
  const onBackToBlueprints = useCallback(() => {
    const current = window.history.state as { loftRoute?: string, previousHash?: string } | null
    if (current?.loftRoute === window.location.hash && current.previousHash === '#/projects') {
      window.history.back()
      return
    }
    navigate({ focus: 'projects', selectedProject: null })
  }, [navigate])

  useEffect(() => {
    const syncRoute = () => {
      const next = routeFromHash(window.location.hash)
      const canonical = hashForRoute(next)
      const current = window.history.state as { loftRoute?: string } | null
      if (window.location.hash !== canonical || current?.loftRoute !== canonical) {
        window.history.replaceState({ loftRoute: canonical }, '', canonical)
      }
      setRoute(next)
      setMobileNavOpen(false)
    }
    window.addEventListener('popstate', syncRoute)
    window.addEventListener('hashchange', syncRoute)
    return () => {
      window.removeEventListener('popstate', syncRoute)
      window.removeEventListener('hashchange', syncRoute)
    }
  }, [])

  useEffect(() => {
    if (focus === 'room' || sceneFailed) document.body.style.cursor = ''
    return () => { document.body.style.cursor = '' }
  }, [focus, sceneFailed])

  const focusRoomNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (mobile && focus !== 'room') setMobileNavOpen(true)
    requestAnimationFrame(() => roomNavRef.current?.focus({ preventScroll: true }))
  }

  return <main className={`hero ${focus !== 'room' ? 'is-focused' : ''}`} aria-label="Interactive loft portfolio">
    <a className="skip-link" href="#room-navigation" onClick={focusRoomNavigation}>Skip the 3D scene</a>
    <div className="scene-layer" aria-hidden="true">
      {!sceneFailed && <SceneImportBoundary onError={onError}><Suspense fallback={null}>
        <LoftScene focus={focus} selectedProject={selectedProject} reducedMotion={reducedMotion} mobile={mobile}
          onFocus={onFocus} onProject={onProject} onReady={onReady} onError={onError} />
      </Suspense></SceneImportBoundary>}
    </div>
    <div className="scene-vignette" aria-hidden="true" />
    <header className="site-header">
      <button className="brand" onClick={() => onFocus('room')} aria-label="Vincent Yen, return to loft overview"><span className="brand-mark">V<span>Y</span></span><span className="brand-name">VINCENT YEN <small>CREATIVE DEVELOPER</small></span></button>
      <div className="header-right"><span className="location">THE LOFT &nbsp; / &nbsp; PORTFOLIO 2026</span>
        <button className="header-contact" onClick={() => onFocus('contact')}>Get in touch <Arrow diagonal /></button>
        {mobile && focus !== 'room' && <button className="mobile-menu-toggle" aria-controls="room-navigation" aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((open) => !open)}>{mobileNavOpen ? 'Close' : 'Destinations'}</button>}
      </div>
    </header>
    {focus === 'room' && <div className="hero-copy">
      <p className="eyebrow"><span className="eyebrow-line" /> AN INTERACTIVE PORTFOLIO</p>
      <h1>Step inside<br /><em>my world.</em></h1>
      <p className="hero-intro">A place for the things I build, the work I’ve done, and the interests that shape it all.</p>
      <div className="hero-actions"><button className="primary-button" onClick={() => onFocus('computer')}>Start at the computer <Arrow /></button></div>
    </div>}
    {!sceneReady && !sceneFailed && <div className="scene-status" role="status"><span className="status-dot" /> Preparing the loft…</div>}
    {sceneFailed && <div className="scene-fallback" role="status"><span>3D VIEW UNAVAILABLE</span><p>The room could not load. Use the destinations to explore this portfolio.</p></div>}
    <nav id="room-navigation" ref={roomNavRef} tabIndex={-1} className={`room-nav ${mobileNavOpen ? 'mobile-open' : ''}`}
      aria-label="Explore the loft" hidden={mobile && focus !== 'room' && !mobileNavOpen}>
      <span className="nav-heading">EXPLORE THE ROOM <span aria-hidden="true">↘</span></span>
      {sections.map((section) => <button key={section.id} ref={(node) => { navButtonsRef.current[section.id] = node }}
        className={focus === section.id ? 'active' : ''} onClick={() => onFocus(section.id)} aria-pressed={focus === section.id}>
        <span className="nav-index">{section.number}</span><span><strong>{section.label}</strong><small>{section.object}</small></span><Arrow />
      </button>)}
    </nav>
    {focus !== 'room' && <FocusPanel focus={focus} selectedProject={selectedProject} sceneAvailable={!sceneFailed}
      onNavigate={navigate} onBack={onBack} onBackToBlueprints={onBackToBlueprints} />}
    <div className="hero-footer"><span>{sceneFailed ? 'USE THE DESTINATIONS TO EXPLORE' : 'INTERACTIVE SPACE  /  CLICK OBJECTS TO EXPLORE'}</span></div>
  </main>
}

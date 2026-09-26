import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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

function FocusPanel({ focus, selectedProject, reducedMotion, sceneAvailable, onFocus, onBack, onProject, onCloseProject }: {
  focus: Focus
  selectedProject: number | null
  reducedMotion: boolean
  sceneAvailable: boolean
  onFocus: (next: Focus) => void
  onBack: (from: SectionFocus) => void
  onProject: (index: number) => void
  onCloseProject: () => void
}) {
  const panelRef = useRef<HTMLElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const projectButtonsRef = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (focus === 'room') return
    panelRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    panelRef.current?.focus({ preventScroll: true })
  }, [focus])

  useEffect(() => {
    if (focus !== 'projects' || selectedProject === null) return
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      const detail = detailRef.current
      if (!panel || !detail) return
      const top = panel.scrollTop + detail.getBoundingClientRect().top - panel.getBoundingClientRect().top - 14
      panel.scrollTo({ top, behavior: reducedMotion ? 'instant' : 'smooth' })
      detail.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [focus, selectedProject, reducedMotion])

  const closeProject = () => {
    const index = selectedProject
    onCloseProject()
    requestAnimationFrame(() => {
      if (index !== null) projectButtonsRef.current[index]?.focus({ preventScroll: true })
    })
  }

  const item = sections.find((section) => section.id === focus)
  if (!item) return null
  const project = selectedProject === null ? null : portfolio.projects[selectedProject]
  return <aside ref={panelRef} tabIndex={-1} className={`focus-panel focus-${focus}`} aria-label={`${item.label} details`}>
    <div className="panel-topline"><span>THE LOFT / {item.number}</span><span>{item.object}</span></div>
    <button className="back-link" onClick={() => onBack(item.id)} aria-label="Back to loft overview">← &nbsp; Back to the loft</button>
    {focus === 'computer' && <>
      <p className="eyebrow">At the computer</p>
      <h2>Hi, I’m<br /><em>Vincent.</em></h2>
      <p className="panel-lead">{portfolio.summary}</p>
      <p className="panel-copy">{portfolio.education}</p>
      <div className="panel-divider" />
      <p className="panel-label">Choose where to go next</p>
      {sections.slice(1).map((section) => <button className="panel-row" key={section.id} onClick={() => onFocus(section.id)}>
        <span>{section.number} / {section.label}</span><Arrow />
      </button>)}
    </>}
    {focus === 'projects' && <>
      <p className="eyebrow">Top view / workbench</p>
      <h2>Selected<br /><em>work.</em></h2>
      <p className="panel-copy">{sceneAvailable ? 'Each blueprint is a project. Pick one on the table or from this list.' : 'Choose a project from the list below.'}</p>
      <div className="project-picker" aria-label="Select a project">
        {portfolio.projects.map((entry, index) => <button key={entry.id} className={`project-choice ${selectedProject === index ? 'selected' : ''}`}
          ref={(node) => { projectButtonsRef.current[index] = node }} onClick={() => onProject(index)} aria-pressed={selectedProject === index}>
          <span className="choice-number">0{index + 1}</span><span>{entry.title}<small>{entry.category}</small></span><Arrow />
        </button>)}
      </div>
      {project && <div ref={detailRef} tabIndex={-1} className="project-detail" role="region" aria-label={`${project.title} details`}>
        <div className="detail-heading"><span>BLUEPRINT / 0{selectedProject! + 1}</span><button onClick={closeProject} aria-label="Close project details">×</button></div>
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
        <div className="detail-meta"><span>{project.year} · {project.status}</span><span>{project.tools.join(' / ')}</span></div>
        {'repository' in project && project.repository && <a className="text-link" href={project.repository} target="_blank" rel="noreferrer">View repository <Arrow diagonal /></a>}
      </div>}
    </>}
    {focus === 'experience' && <>
      <p className="eyebrow">Pinned to the wall</p>
      <h2>Where I’ve<br /><em>worked.</em></h2>
      <div className="experience-list">{portfolio.experience.map((role) => <article key={role.company}>
        <span>{role.period}</span><h3>{role.company}</h3><p className="role">{role.role}</p><p>{role.summary}</p>
      </article>)}</div>
    </>}
    {focus === 'about' && <>
      <p className="eyebrow">The personal shelf</p>
      <h2>More than<br /><em>code.</em></h2>
      <p className="panel-lead">{portfolio.about}</p>
      <div className="interests"><span>Camcorder / storytelling</span><span>Football / sports</span><span>Headphones / music</span><span>Recipes / cooking</span></div>
    </>}
    {focus === 'contact' && <>
      <p className="eyebrow">The doorway</p>
      <h2>Let’s make<br /><em>something.</em></h2>
      <p className="panel-lead">I’m always interested in thoughtful work and good conversations.</p>
      <a className="contact-primary" href={portfolio.links.linkedin} target="_blank" rel="noreferrer">Connect on LinkedIn <Arrow diagonal /></a>
      <a className="panel-row" href={portfolio.links.github} target="_blank" rel="noreferrer"><span>Explore GitHub</span><Arrow diagonal /></a>
    </>}
  </aside>
}

function SiteContent({ onFocus, reducedMotion, sceneAvailable }: { onFocus: (next: Focus) => void, reducedMotion: boolean, sceneAvailable: boolean }) {
  return <main id="portfolio-content" className="site-content">
    <div className="content-heading"><p className="eyebrow">Beyond the room</p><h2>A closer look.</h2><p>Explore the portfolio in a simple format.</p></div>
    <section id="projects" className="content-section" aria-labelledby="projects-title">
      <div className="section-heading"><span>01 / Selected projects</span><h3 id="projects-title">Built with purpose.</h3></div>
      <div className="content-grid">{portfolio.projects.map((project, index) => <article className="content-card" key={project.id}>
        <span className="card-number">0{index + 1} / {project.category}</span><h4>{project.title}</h4><p>{project.summary}</p>
        <div className="card-bottom"><span>{project.status}</span>{'repository' in project && project.repository && <a href={project.repository} target="_blank" rel="noreferrer">Repository <Arrow diagonal /></a>}</div>
      </article>)}</div>
      {sceneAvailable && <button className="content-scene-link" onClick={() => { window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' }); onFocus('projects') }}>View the workbench <Arrow /></button>}
    </section>
    <section id="experience" className="content-section two-col" aria-labelledby="experience-title">
      <div className="section-heading"><span>02 / Experience</span><h3 id="experience-title">Learning by making.</h3></div>
      <div className="timeline">{portfolio.experience.map((role) => <article key={role.company}><span>{role.period}</span><div><h4>{role.company}</h4><strong>{role.role}</strong><p>{role.summary}</p></div></article>)}</div>
    </section>
    <section id="about" className="content-section two-col" aria-labelledby="about-title">
      <div className="section-heading"><span>03 / About</span><h3 id="about-title">A little context.</h3></div><p className="about-text">{portfolio.about}</p>
    </section>
    <section id="contact" className="content-section contact-section" aria-labelledby="contact-title">
      <span>04 / Contact</span><h3 id="contact-title">Have something in mind?</h3><a href={portfolio.links.linkedin} target="_blank" rel="noreferrer">Let’s connect <Arrow diagonal /></a>
    </section>
    <footer><span>© {new Date().getFullYear()} Vincent Yen</span><span>Made as an actual 3D space.</span><button onClick={() => { window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' }); onFocus('room') }}>Back to the loft ↑</button></footer>
  </main>
}

export default function App() {
  const [focus, setFocus] = useState<Focus>('room')
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(() => !canUseWebGL() || new URLSearchParams(window.location.search).has('no3d'))
  const navButtonsRef = useRef<Partial<Record<SectionFocus, HTMLButtonElement | null>>>({})
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)')
  const mobile = useMedia('(max-width: 700px)')
  const onReady = useCallback(() => setSceneReady(true), [])
  const onError = useCallback(() => setSceneFailed(true), [])
  const onFocus = useCallback((next: Focus) => { setSelectedProject(null); setFocus(next) }, [])
  const onBack = useCallback((from: SectionFocus) => {
    setSelectedProject(null)
    setFocus('room')
    requestAnimationFrame(() => navButtonsRef.current[from]?.focus({ preventScroll: true }))
  }, [])
  const onProject = useCallback((index: number) => { setFocus('projects'); setSelectedProject(index) }, [])

  useEffect(() => {
    if (focus === 'room' || sceneFailed) document.body.style.cursor = ''
    return () => { document.body.style.cursor = '' }
  }, [focus, sceneFailed])

  return <>
    <a className="skip-link" href="#portfolio-content">Skip the 3D scene</a>
    <section className={`hero ${focus !== 'room' ? 'is-focused' : ''}`} aria-label="Interactive loft portfolio">
      <div className="scene-layer" aria-hidden="true">
        {!sceneFailed && <SceneImportBoundary onError={onError}><Suspense fallback={null}>
          <LoftScene focus={focus} selectedProject={selectedProject} reducedMotion={reducedMotion} mobile={mobile}
            onFocus={onFocus} onProject={onProject} onReady={onReady} onError={onError} />
        </Suspense></SceneImportBoundary>}
      </div>
      <div className="scene-vignette" aria-hidden="true" />
      <header className="site-header">
        <button className="brand" onClick={() => onFocus('room')} aria-label="Vincent Yen, return to loft overview"><span className="brand-mark">V<span>Y</span></span><span className="brand-name">VINCENT YEN <small>CREATIVE DEVELOPER</small></span></button>
        <div className="header-right"><span className="location">THE LOFT &nbsp; / &nbsp; PORTFOLIO 2026</span><a href="#contact" className="header-contact">Get in touch <Arrow diagonal /></a></div>
      </header>
      {focus === 'room' && <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-line" /> AN INTERACTIVE PORTFOLIO</p>
        <h1>Step inside<br /><em>my world.</em></h1>
        <p className="hero-intro">A place for the things I build, the work I’ve done, and the interests that shape it all.</p>
        <div className="hero-actions"><button className="primary-button" onClick={() => onFocus('computer')}>Start at the computer <Arrow /></button><a href="#portfolio-content" className="quiet-link">Explore without 3D ↓</a></div>
      </div>}
      {!sceneReady && !sceneFailed && <div className="scene-status" role="status"><span className="status-dot" /> Preparing the loft…</div>}
      {sceneFailed && <div className="scene-fallback" role="status"><span>3D VIEW UNAVAILABLE</span><p>The portfolio is ready below, and every room destination is available here.</p></div>}
      <nav className="room-nav" aria-label="Explore the loft">
        <span className="nav-heading">EXPLORE THE ROOM <span aria-hidden="true">↘</span></span>
        {sections.map((section) => <button key={section.id} ref={(node) => { navButtonsRef.current[section.id] = node }} className={focus === section.id ? 'active' : ''} onClick={() => onFocus(section.id)} aria-pressed={focus === section.id}>
          <span className="nav-index">{section.number}</span><span><strong>{section.label}</strong><small>{section.object}</small></span><Arrow />
        </button>)}
      </nav>
      <FocusPanel focus={focus} selectedProject={selectedProject} reducedMotion={reducedMotion} sceneAvailable={!sceneFailed} onFocus={onFocus} onBack={onBack} onProject={onProject} onCloseProject={() => setSelectedProject(null)} />
      <div className="hero-footer"><span>{sceneFailed ? 'USE THE DESTINATIONS TO EXPLORE' : 'INTERACTIVE SPACE  /  CLICK OBJECTS TO EXPLORE'}</span><a href="#portfolio-content">SCROLL FOR THE FULL STORY <span aria-hidden="true">↓</span></a></div>
    </section>
    <SiteContent onFocus={onFocus} reducedMotion={reducedMotion} sceneAvailable={!sceneFailed} />
  </>
}

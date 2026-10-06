import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import portfolio from '../content/portfolio.json'
import type { Focus } from './LoftScene'

type TerminalLine = { id: number, kind: 'system' | 'command' | 'output' | 'link' | 'heading' | 'entry', text: string, href?: string }

const openingLines: TerminalLine[] = [
  { id: 0, kind: 'heading', text: '01 / ABOUT' },
  { id: 1, kind: 'entry', text: `NAME ............ ${portfolio.name}` },
  { id: 2, kind: 'entry', text: `ROLE ............ ${portfolio.role}` },
  { id: 3, kind: 'entry', text: 'STUDY ........... Texas A&M / Computer Science + Cybersecurity' },
  { id: 4, kind: 'entry', text: 'BUILDING ........ Geospatial tools / AI / web applications' },
  { id: 5, kind: 'output', text: portfolio.summary },
  { id: 6, kind: 'system', text: 'SELECT A SECTION ABOVE OR TYPE HELP TO EXPLORE.' },
]

export function usePortfolioTerminal(onNavigate: (focus: Focus) => void) {
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const commandHistory = useRef<string[]>([])
  const historyCursor = useRef(0)
  const nextLineId = useRef(openingLines.length)
  const [draft, setDraft] = useState('')
  const [lines, setLines] = useState<TerminalLine[]>(openingLines)

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [lines])

  const makeLine = (kind: TerminalLine['kind'], text: string, href?: string): TerminalLine => ({
    id: nextLineId.current++, kind, text, href,
  })

  const executeCommand = (source: string) => {
    const entered = source.trim()
    if (!entered) return
    const command = entered.toLowerCase().split(/\s+/)[0]
    commandHistory.current = [...commandHistory.current.slice(-39), entered]
    historyCursor.current = 0
    setDraft('')

    if (command === 'room' || command === 'exit' || command === 'back') {
      onNavigate('room')
      return
    }

    if (command === 'clear') {
      setLines([makeLine('heading', 'INDEX / CLEARED'), makeLine('system', 'TYPE HELP TO SEE THE AVAILABLE COMMANDS.')])
      return
    }

    const response: TerminalLine[] = []
    const heading = (text: string) => response.push(makeLine('heading', text))
    const entry = (text: string) => response.push(makeLine('entry', text))
    const output = (text: string) => response.push(makeLine('output', text))
    const link = (label: string, href: string) => response.push(makeLine('link', label, href))
    switch (command) {
      case 'help':
        heading('COMMAND INDEX')
        entry('PROFILE ...... whoami / about / education / skills')
        entry('WORK ......... experience / projects')
        entry('CONNECT ...... contact / github / linkedin')
        entry('SYSTEM ....... clear / room / back / exit')
        break
      case 'whoami':
        heading('IDENTITY / WHOAMI')
        entry(`NAME ......... ${portfolio.name}`)
        entry(`ROLE ......... ${portfolio.role}`)
        output(portfolio.summary)
        break
      case 'about':
        heading('ABOUT')
        output(portfolio.about)
        break
      case 'education':
        heading('EDUCATION')
        entry(portfolio.education)
        break
      case 'experience':
        heading('EXPERIENCE')
        portfolio.experience.forEach((item) => {
          entry(`${item.role} / ${item.company} / ${item.period}`)
          output(item.summary)
        })
        break
      case 'projects':
        heading('PROJECT INDEX')
        portfolio.projects.forEach((project, index) => {
          entry(`0${index + 1} / ${project.title} / ${project.category}`)
          output(project.summary)
          project.highlights.forEach(output)
          project.links.forEach((item) => link(item.label, item.url))
        })
        break
      case 'skills':
        heading('TECHNICAL TOOLKIT')
        output(portfolio.skills.join(' / '))
        break
      case 'contact':
        heading('CONTACT / LINKS')
        link('GitHub', portfolio.links.github)
        link('LinkedIn', portfolio.links.linkedin)
        link('Devpost', portfolio.links.devpost)
        break
      case 'github':
        heading('GITHUB')
        link('Open GitHub profile', portfolio.links.github)
        break
      case 'linkedin':
        heading('LINKEDIN')
        link('Open LinkedIn profile', portfolio.links.linkedin)
        break
      default:
        output(`command not found: ${entered}. Type help to see available commands.`)
    }

    const commandLine = makeLine('command', entered)
    setLines((previous) => [...previous, commandLine, ...response].slice(-80))
  }

  const submitCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    executeCommand(draft)
  }

  const handleCommandKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' && commandHistory.current.length) {
      event.preventDefault()
      historyCursor.current = Math.min(commandHistory.current.length, historyCursor.current + 1)
      setDraft(commandHistory.current[commandHistory.current.length - historyCursor.current] ?? '')
    } else if (event.key === 'ArrowDown' && historyCursor.current > 0) {
      event.preventDefault()
      historyCursor.current -= 1
      setDraft(historyCursor.current === 0
        ? ''
        : commandHistory.current[commandHistory.current.length - historyCursor.current] ?? '')
    }
  }

  return { inputRef, outputRef, draft, setDraft, lines, executeCommand, submitCommand, handleCommandKeys, onNavigate }
}

export function ComputerScreen({ controller }: { controller: ReturnType<typeof usePortfolioTerminal> }) {
  const { inputRef, outputRef, draft, setDraft, lines, executeCommand, submitCommand, handleCommandKeys, onNavigate } = controller
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true })
  }, [inputRef])
  const shortcuts = ['about', 'experience', 'projects', 'contact']
  return <section className="world-screen world-computer-screen world-terminal" aria-label="Interactive portfolio terminal"
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => {
      if (!(event.target instanceof Element) || !event.target.closest('button, a, input')) inputRef.current?.focus()
    }}>
    <div className="terminal-chrome">
      <span><span className="terminal-status" aria-hidden="true" /> VINCENT@LOFT <span className="terminal-path">~/portfolio</span></span>
      <button className="terminal-room-button" type="button" onClick={() => onNavigate('room')}>↩&nbsp; ROOM</button>
    </div>
    <div className="terminal-body">
      <div ref={outputRef} className="terminal-output" role="log" aria-live="polite" aria-label="Terminal output">
        {lines.map((line) => line.kind === 'link'
          ? <p className="terminal-line terminal-link" key={line.id}><a href={line.href} target="_blank" rel="noreferrer">{line.text} ↗</a></p>
          : <p className={`terminal-line terminal-${line.kind}`} key={line.id}>
            {line.kind === 'command' && <span className="terminal-prompt" aria-hidden="true">$&nbsp;</span>}{line.text}
          </p>)}
      </div>
      <form className="terminal-command-form" onSubmit={submitCommand}>
        <span className="terminal-prompt" aria-hidden="true">$</span>
        <label className="visually-hidden" htmlFor="loft-terminal-command">Enter a portfolio command</label>
        <input ref={inputRef} id="loft-terminal-command" type="text" value={draft}
          onChange={(event) => setDraft(event.target.value)} onKeyDown={handleCommandKeys}
          autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="type a command…" />
        <button type="submit" aria-label="Run command">↵</button>
      </form>
      <div className="terminal-shortcuts" aria-label="Suggested commands">
        {shortcuts.map((command) => <button type="button" key={command} onClick={() => executeCommand(command)}>{command}</button>)}
      </div>
    </div>
  </section>
}

export function BlueprintButton({ index, onSelect }: { index: number, onSelect: () => void }) {
  const project = portfolio.projects[index]
  return <button type="button" className="world-blueprint-target" data-blueprint-index={index} aria-label={`Open project: ${project.title}`}
    onPointerDown={(event) => event.stopPropagation()} onClick={(event) => {
      event.stopPropagation()
      onSelect()
    }} />
}

type Project = typeof portfolio.projects[number]

export function ProjectScreen({ project, index, onBack }: {
  project: Project
  index: number
  onBack: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.focus({ preventScroll: true })
  }, [project.id])

  return <article className="world-screen world-project-screen" aria-label={`${project.title} project details`}
    onPointerDown={(event) => event.stopPropagation()}>
    <div className="world-project-chrome">
      <span>DRAWING / 2026.0{index + 1}</span>
      <button type="button" onClick={onBack}>←&nbsp; BLUEPRINTS</button>
    </div>
    <div ref={scrollRef} className="world-project-scroll" tabIndex={0} aria-label={`Scroll through ${project.title} details`}
      onWheel={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key !== 'Escape') event.stopPropagation() }}>
      <p className="world-screen-kicker">{project.category}</p>
      <h2>{project.title}</h2>
      <p className="world-project-summary">{project.summary}</p>
      <div className="world-project-gallery" aria-label={`${project.title} screenshots`}>
        {project.images.map((image) => <figure key={image.src}>
          <img src={`${import.meta.env.BASE_URL}${image.src}`} alt={image.alt} />
        </figure>)}
      </div>
      <dl className="world-project-facts">
        <div><dt>YEAR</dt><dd>{project.year}</dd></div>
        <div><dt>STATUS</dt><dd>{project.status}</dd></div>
      </dl>
      <div className="world-project-tools">
        <p className="world-screen-kicker">BUILT WITH</p>
        <ul>{project.tools.map((tool) => <li key={tool}>{tool}</li>)}</ul>
      </div>
      <div className="world-project-sections">
        {project.sections.map((section) => <section key={section.heading}>
          <h3>{section.heading}</h3>
          <p>{section.body}</p>
          {section.points && <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}
        </section>)}
      </div>
      <div className="world-project-links">
        {project.links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
          {link.label}<span aria-hidden="true">↗</span>
        </a>)}
      </div>
      <p className="world-project-scroll-hint">Scroll the sheet for details · Use “Blueprints” to choose another</p>
    </div>
  </article>
}

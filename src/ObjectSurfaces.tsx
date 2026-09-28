import { useEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import portfolio from '../content/portfolio.json'
import { ComputerScreen, ProjectScreen, BlueprintButton, usePortfolioTerminal } from './WorldScreens'
import { benchScale, benchPoint, computerPoint, projectView, type Point } from './loftLayout'
import type { Focus } from './LoftScene'

export function useSurface(width: number, height: number) {
  const { gl } = useThree()
  const surface = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return { canvas, ctx, texture }
  }, [gl, width, height])
  useEffect(() => () => surface.texture.dispose(), [surface])
  return surface
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number) {
  let line = ''
  for (const word of text.split(/\s+/)) {
    if (line && ctx.measureText(`${line} ${word}`).width > width) {
      ctx.fillText(line, x, y)
      y += lineHeight
      line = word
    } else line += `${line ? ' ' : ''}${word}`
  }
  if (line) ctx.fillText(line, x, y)
  return y + lineHeight
}

const cursor = (value: string) => { document.body.style.cursor = value }
type LinkArea = { top: number, bottom: number, href: string }

export function MonitorSurface({ active, reducedMotion, onFocus }: {
  active: boolean, reducedMotion: boolean, onFocus: (focus: Focus) => void
}) {
  const surface = useSurface(1200, 724)
  const terminal = usePortfolioTerminal(onFocus)
  const [ready, setReady] = useState(false)
  const age = useRef(0)
  const lastDraw = useRef(-1)
  const scroll = useRef(0)
  const maxScroll = useRef(0)
  const touchY = useRef<number | null>(null)
  const links = useRef<LinkArea[]>([])
  const dirty = useRef(true)
  const focusedControl = useRef('')
  useEffect(() => {
    age.current = 0
    lastDraw.current = -1
    dirty.current = true
    setReady(active && reducedMotion)
    if (!active || reducedMotion) return
    const timer = window.setTimeout(() => setReady(true), 3000)
    return () => window.clearTimeout(timer)
  }, [active, reducedMotion])
  useEffect(() => {
    if (active && ready && window.matchMedia('(pointer: fine)').matches) terminal.inputRef.current?.focus({ preventScroll: true })
    dirty.current = true
  }, [active, ready, terminal.inputRef])
  useEffect(() => { scroll.current = Infinity; dirty.current = true }, [terminal.lines])
  useEffect(() => { dirty.current = true }, [terminal.draft])

  useFrame((_, delta) => {
    age.current += Math.min(delta, .1)
    const tick = Math.floor(age.current * (ready ? 2 : 10))
    if (!dirty.current && (!active || tick === lastDraw.current)) return
    lastDraw.current = tick
    dirty.current = false
    const { ctx, texture } = surface
    ctx.fillStyle = '#070b0c'
    ctx.fillRect(0, 0, 1200, 724)
    if (!active || (!reducedMotion && age.current < .65)) { texture.needsUpdate = true; return }
    ctx.font = '20px monospace'
    ctx.fillStyle = '#83a996'
    ctx.fillText('VINCENT@LOFT  ~/portfolio', 32, 40)
    ctx.fillStyle = '#e0b783'
    ctx.fillText('[ ROOM ]', 1050, 40)
    if (focusedControl.current.includes('ROOM')) { ctx.strokeStyle = '#e0b783'; ctx.strokeRect(1038, 15, 146, 36) }
    ctx.strokeStyle = '#283a32'
    ctx.beginPath(); ctx.moveTo(30, 58); ctx.lineTo(1170, 58); ctx.stroke()
    if (!ready) {
      const step = Math.max(0, Math.min(5, Math.floor((age.current - .65) * 2.4)))
      const boot = ['> power on', '> waking display ... OK', '> mounting /portfolio ... OK', '> loading projects, experience, about', '> starting interactive shell', '> ready']
      ctx.fillStyle = '#a7c6b2'
      boot.slice(0, step + 1).forEach((line, i) => ctx.fillText(line, 42, 110 + i * 32))
      ctx.font = '30px monospace'
      const frames = ['[    /\\    ]', '[   /  \\   ]', '[  / LOFT\\  ]', '[  |    |  ]']
      ctx.fillText(frames[Math.floor(age.current * 5) % frames.length], 465, 410)
      ctx.font = '20px monospace'
      const progress = Math.min(20, Math.floor((age.current - .65) / 2.35 * 20))
      ctx.fillText(`[${'='.repeat(Math.max(0, progress))}${' '.repeat(20 - Math.max(0, progress))}]`, 430, 460)
      texture.needsUpdate = true
      return
    }
    // Measure first so old output can scroll without moving the command prompt.
    ctx.font = '22px monospace'
    let total = 0
    for (const line of terminal.lines) total += Math.max(1, Math.ceil(ctx.measureText(line.text).width / 1100)) * 31 + 9
    maxScroll.current = Math.max(0, total - 480)
    scroll.current = Math.min(scroll.current, maxScroll.current)
    links.current = []
    ctx.save(); ctx.beginPath(); ctx.rect(30, 78, 1140, 480); ctx.clip()
    let y = 103 - scroll.current
    for (const line of terminal.lines) {
      ctx.fillStyle = line.kind === 'command' ? '#e4ba85' : line.kind === 'system' ? '#82a390' : '#d0dfd3'
      const startY = y
      y = wrap(ctx, `${line.kind === 'command' ? '$ ' : ''}${line.text}${line.href ? ' ↗' : ''}`, 36, y, 1100, 31) + 9
      if (line.href) links.current.push({ top: startY - 25, bottom: y - 9, href: line.href })
    }
    ctx.restore()
    ctx.strokeStyle = '#536e5a'; ctx.strokeRect(30, 588, 1140, 65)
    ctx.fillStyle = '#e4ba85'; ctx.fillText('$', 47, 630)
    ctx.fillStyle = '#dce9dc'
    ctx.fillText(terminal.draft.slice(-76) || 'type help to explore', 82, 630)
    if (!reducedMotion && tick % 2 === 0) ctx.fillRect(82 + ctx.measureText(terminal.draft.slice(-76)).width, 611, 11, 22)
    ctx.fillStyle = '#89a493'; ctx.font = '19px monospace'
    ;['about', 'experience', 'projects', 'contact'].forEach((command, i) => {
      ctx.fillText(`[ ${command} ]`, 34 + i * 300, 693)
      if (focusedControl.current === command) { ctx.strokeStyle = '#e0b783'; ctx.strokeRect(28 + i * 300, 668, 242, 35) }
    })
    texture.needsUpdate = true
  })

  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (!active) { onFocus('computer'); return }
    if (!event.uv) return
    const x = event.uv.x * 1200, y = (1 - event.uv.y) * 724
    if (y < 60 && x > 1015) { onFocus('room'); return }
    if (!ready) return
    if (y > 667) { terminal.executeCommand(['about', 'experience', 'projects', 'contact'][Math.min(3, Math.floor(x / 300))]); return }
    const link = y > 78 && y < 558 ? links.current.find((area) => y >= area.top && y <= area.bottom) : undefined
    if (link) { window.open(link.href, '_blank', 'noopener,noreferrer'); return }
    terminal.inputRef.current?.focus({ preventScroll: true })
  }
  return <group position={computerPoint([-1.71, 1.63, -2.369])}>
    <mesh onClick={click} onPointerOver={() => cursor('pointer')} onPointerOut={() => cursor('')}
      onWheel={(event) => { if (active) { event.stopPropagation(); scroll.current = THREE.MathUtils.clamp(scroll.current + event.deltaY, 0, maxScroll.current); dirty.current = true } }}
      onPointerDown={(event) => { touchY.current = event.clientY }}
      onPointerMove={(event) => { if (active && event.buttons && touchY.current !== null) { scroll.current = THREE.MathUtils.clamp(scroll.current + (touchY.current - event.clientY) * 2, 0, maxScroll.current); touchY.current = event.clientY; dirty.current = true } }}
      onPointerUp={() => { touchY.current = null }}>
      <planeGeometry args={[1.69, 1.02]} />
      <meshBasicMaterial map={surface.texture} toneMapped={false} />
    </mesh>
    {active && <Html><div className="visually-hidden" onFocusCapture={(event) => {
      focusedControl.current = event.target.textContent?.trim() ?? ''
      dirty.current = true
    }} onBlurCapture={() => { focusedControl.current = ''; dirty.current = true }}>
      <p role="status">{ready ? 'Terminal ready. Type help to explore, or room to leave.' : 'Starting the portfolio terminal.'}</p>
      {ready && <ComputerScreen controller={terminal} />}
    </div></Html>}
  </group>
}

const sheetPositions: Point[] = [benchPoint([.86, 1.01, .72]), benchPoint([2.48, 1.01, .93]), benchPoint([3.78, 1.01, 1.41])]
const sheetAngles = [-.08, .09, -.065]

export function ProjectSheet({ index, selected, enabled, mobile, reducedMotion, onSelect, onBack }: {
  index: number, selected: boolean, enabled: boolean, mobile: boolean, reducedMotion: boolean,
  onSelect: () => void, onBack: () => void
}) {
  const surface = useSurface(1200, 840)
  const group = useRef<THREE.Group>(null)
  const { size } = useThree()
  const project = portfolio.projects[index]
  const [scroll, setScroll] = useState(0)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const linkY = useRef(0)
  const maxScroll = useRef(0)
  const touch = useRef<number | null>(null)
  const dragged = useRef(false)
  const start = sheetPositions[index]
  useEffect(() => {
    const node = group.current
    if (!node) return
    const center = benchPoint([2.28, 0, 1.04])
    const y = mobile ? projectView.mobilePaperHeight : projectView.paperHeight
    // Fit the physical paper to the camera's visible area, including narrow screens.
    const height = 2 * (projectView.cameraHeight - y) * Math.tan(THREE.MathUtils.degToRad((mobile ? projectView.mobileFov : projectView.fov) / 2))
    const scale = Math.min(height * .73 / 1.09, height * size.width / size.height * .88 / 1.53)
    const position = selected ? [center[0], y, center[2]] : start
    const rotation = selected ? 0 : sheetAngles[index]
    if (reducedMotion) { node.position.set(position[0], position[1], position[2]); node.scale.setScalar(selected ? scale : benchScale); node.rotation.y = rotation; return }
    const motion = gsap.timeline({ defaults: { duration: 1.25, ease: 'power3.inOut' } })
    motion.to(node.position, { x: position[0], y: position[1], z: position[2] }, 0)
    motion.to(node.rotation, { y: rotation }, 0)
    motion.to(node.scale, { x: selected ? scale : benchScale, y: selected ? scale : benchScale, z: selected ? scale : benchScale }, 0)
    return () => { motion.kill() }
  }, [index, mobile, reducedMotion, selected, size.width, size.height, start])

  useEffect(() => {
    const { ctx, texture } = surface
    ctx.fillStyle = '#102a34'; ctx.fillRect(0, 0, 1200, 840)
    ctx.strokeStyle = '#1f3c45'; ctx.lineWidth = 1
    for (let x = 24; x < 1200; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 840); ctx.stroke() }
    for (let y = 24; y < 840; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke() }
    ctx.strokeStyle = keyboardFocus && !selected ? '#ffd094' : '#91b8b9'; ctx.lineWidth = keyboardFocus && !selected ? 8 : 2; ctx.strokeRect(20, 20, 1160, 800)
    ctx.fillStyle = '#a4c5c6'; ctx.font = '19px monospace'
    ctx.fillText(`V/Y  DESIGN WORKSHOP     /     SHEET 0${index + 1}`, 46, 58)
    ctx.fillStyle = '#e7b880'; ctx.fillText(selected ? '[ BACK TO TABLE ]' : '[ OPEN PROJECT ]', 935, 58)
    ctx.save(); ctx.beginPath(); ctx.rect(40, 92, 1120, 673); ctx.clip(); ctx.translate(0, -scroll)
    ctx.fillStyle = '#e4ecdf'; ctx.font = 'bold 51px sans-serif'; ctx.fillText(project.title, 48, 154)
    ctx.fillStyle = '#a1c4c4'; ctx.font = '20px monospace'; ctx.fillText(`${project.category.toUpperCase()}  /  ${project.year}  /  ${project.status.toUpperCase()}`, 50, 199)
    // A printed interface drawing shares the paper with its actual project data.
    ctx.strokeStyle = '#91b8b9'; ctx.lineWidth = 2; ctx.strokeRect(52, 232, 670, 240)
    ctx.strokeRect(70, 256, 130, 194); ctx.strokeRect(220, 256, 480, 44)
    for (let i = 0; i < 3; i++) { ctx.strokeRect(220 + i * 165, 318, 148, 130); ctx.beginPath(); ctx.moveTo(238 + i * 165, 343); ctx.lineTo(345 + i * 165, 343); ctx.stroke() }
    ctx.fillStyle = '#e7b880'; ctx.font = '19px monospace'; ctx.fillText('BUILD NOTES', 768, 256)
    ctx.fillStyle = '#bfd4cd'; ctx.font = '22px monospace'
    project.tools.forEach((tool, i) => ctx.fillText(`${String(i + 1).padStart(2, '0')} / ${tool}`, 768, 303 + i * 36))
    ctx.fillStyle = '#e7b880'; ctx.font = '19px monospace'; ctx.fillText('PROJECT OVERVIEW', 50, 522)
    ctx.fillStyle = '#e0e9dd'; ctx.font = '29px sans-serif'
    let y = wrap(ctx, project.summary, 50, 570, 1040, 43)
    y += 37; ctx.strokeStyle = '#60868e'; ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(1150, y); ctx.stroke()
    ctx.fillStyle = '#9fbfc0'; ctx.font = '20px monospace'; ctx.fillText('TECHNOLOGIES', 50, y + 46)
    ctx.fillStyle = '#e0e9dd'; ctx.font = '28px sans-serif'; y = wrap(ctx, project.tools.join(' / '), 50, y + 90, 1040, 40)
    linkY.current = y + 26
    if ('repository' in project && project.repository) { ctx.fillStyle = '#edc08d'; ctx.font = '24px monospace'; ctx.fillText('VIEW REPOSITORY  ↗', 50, y + 50); y += 90 }
    y += 70
    ctx.fillStyle = '#91b4b6'; ctx.font = '18px monospace'; ctx.fillText(`END OF SHEET 0${index + 1} / ${project.title.toUpperCase()}`, 50, y)
    maxScroll.current = Math.max(0, y + 25 - 765)
    ctx.restore()
    ctx.fillStyle = '#102a34'; ctx.fillRect(35, 775, 1130, 32)
    ctx.fillStyle = '#9fbdbb'; ctx.font = '17px monospace'; ctx.fillText(selected ? 'SCROLL PAPER  /  DRAG TO READ  /  ESC TO RETURN' : 'SELECT THIS DRAWING TO EXPLORE', 50, 797)
    if (selected && maxScroll.current > 0) { ctx.fillStyle = '#c4cdb7'; ctx.fillRect(1150, 110 + scroll / maxScroll.current * 525, 4, 90) }
    texture.needsUpdate = true
  }, [project, index, selected, scroll, surface, keyboardFocus])

  const changeScroll = (delta: number) => setScroll((value) => THREE.MathUtils.clamp(value + delta, 0, maxScroll.current))
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (dragged.current) { dragged.current = false; return }
    if (!selected) { if (enabled) onSelect(); return }
    if (!event.uv) return
    const x = event.uv.x * 1200, y = (1 - event.uv.y) * 840
    if (y < 88 && x > 915) { onBack(); return }
    if (y > 92 && y < 765 && y + scroll >= linkY.current && y + scroll <= linkY.current + 55 && 'repository' in project && project.repository) window.open(project.repository, '_blank', 'noopener,noreferrer')
  }
  return <group ref={group} position={start} scale={benchScale} rotation={[0, sheetAngles[index], 0]}>
    <mesh castShadow receiveShadow><boxGeometry args={[1.53, .009, 1.09]} /><meshStandardMaterial color="#ccc8b6" roughness={.94} /></mesh>
    <mesh position={[0, .006, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={click}
      onPointerOver={() => { if (enabled || selected) cursor('pointer') }} onPointerOut={() => cursor('')}
      onWheel={(event) => { if (selected) { event.stopPropagation(); changeScroll(event.deltaY) } }}
      onPointerDown={(event) => { touch.current = event.clientY; dragged.current = false }}
      onPointerMove={(event) => { if (selected && event.buttons && touch.current !== null) { const delta = touch.current - event.clientY; if (Math.abs(delta) > 2) dragged.current = true; changeScroll(delta * 2); touch.current = event.clientY } }}
      onPointerUp={() => { touch.current = null }}>
      <planeGeometry args={[1.46, 1.02]} />
      <meshStandardMaterial map={surface.texture} roughness={.96} metalness={0} emissiveMap={surface.texture} emissive="#ffffff" emissiveIntensity={selected ? .42 : .14} />
    </mesh>
    {(enabled || selected) && <Html><div className="visually-hidden" onFocusCapture={() => setKeyboardFocus(true)} onBlurCapture={() => setKeyboardFocus(false)} onKeyDownCapture={(event) => {
      if (!selected) return
      if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); changeScroll(event.key === 'PageDown' ? 350 : 55) }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); changeScroll(event.key === 'PageUp' ? -350 : -55) }
    }}>
      {selected ? <ProjectScreen project={project} index={index} onBack={onBack} /> : <BlueprintButton index={index} onSelect={onSelect} />}
    </div></Html>}
  </group>
}

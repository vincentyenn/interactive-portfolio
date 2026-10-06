import { useEffect, useMemo, useRef, useState } from 'react'
import { Html, useTexture } from '@react-three/drei'
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

function drawContainedImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, background = '#101718') {
  ctx.fillStyle = background
  ctx.fillRect(x, y, width, height)
  if (!image.complete || !image.naturalWidth || !image.naturalHeight) return
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

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

export function AboutSurface({ selected, focused, width, height, onOpen, onBack }: {
  selected: boolean, focused: boolean, width: number, height: number,
  onOpen: () => void, onBack: () => void
}) {
  const pixelsHigh = Math.round(1200 * height / width)
  const surface = useSurface(1200, pixelsHigh)
  const photos = portfolio.aboutPhotos
  const photoTextures = useTexture(photos.map((photo) => assetUrl(photo.src)))
  const images = useMemo(() => photoTextures.map((image) => image.image as HTMLImageElement), [photoTextures])
  const [scroll, setScroll] = useState(0)
  const maxScroll = useRef(0)
  const touch = useRef<number | null>(null)
  const dragged = useRef(false)
  const scrollBy = (delta: number) => setScroll((value) => THREE.MathUtils.clamp(value + delta, 0, maxScroll.current))

  useEffect(() => {
    photoTextures.forEach((texture) => { texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true })
  }, [photoTextures])

  useEffect(() => {
    const { ctx, texture } = surface
    ctx.fillStyle = '#e9e6db'; ctx.fillRect(0, 0, 1200, pixelsHigh)
    ctx.strokeStyle = focused ? '#c3864e' : '#8f9187'; ctx.lineWidth = focused ? 8 : 2
    ctx.strokeRect(22, 22, 1156, pixelsHigh - 44)

    if (!selected) {
      ctx.fillStyle = '#425d50'; ctx.font = '22px monospace'; ctx.fillText('VINCENT YEN  /  PERSONAL', 66, 92)
      ctx.fillStyle = '#26352f'; ctx.font = 'bold 86px sans-serif'; ctx.fillText('About me.', 66, 205)
      ctx.fillStyle = '#42514a'; ctx.font = '32px sans-serif'
      wrap(ctx, 'Computer science, cybersecurity, football, film, and the people around me.', 68, 265, 1040, 43)
      const y = 414, gap = 22
      const widths = [490, 238, 238]
      let x = 90
      images.forEach((image, index) => {
        drawContainedImage(ctx, image, x, y, widths[index], 312)
        ctx.strokeStyle = '#b3b0a4'; ctx.lineWidth = 2; ctx.strokeRect(x, y, widths[index], 312)
        x += widths[index] + gap
      })
      ctx.fillStyle = '#526459'; ctx.font = '20px monospace'; ctx.fillText('[ OPEN ABOUT ME ]', 68, pixelsHigh - 72)
      texture.needsUpdate = true
      return
    }

    ctx.fillStyle = '#33483d'; ctx.fillRect(24, 24, 1152, 84)
    ctx.fillStyle = '#e7e5d8'; ctx.font = '20px monospace'; ctx.fillText('VINCENT YEN  /  ABOUT', 54, 76)
    ctx.textAlign = 'right'; ctx.fillStyle = '#efc391'; ctx.fillText('[ BACK TO SHELF ]', 1142, 76); ctx.textAlign = 'left'

    const contentTop = 126
    const contentBottom = pixelsHigh - 104
    ctx.save(); ctx.beginPath(); ctx.rect(48, contentTop, 1104, contentBottom - contentTop); ctx.clip(); ctx.translate(0, -scroll)
    let y = 207
    ctx.fillStyle = '#26352f'; ctx.font = 'bold 82px sans-serif'; ctx.fillText('About me.', 68, y)
    ctx.fillStyle = '#49554d'; ctx.font = '34px sans-serif'
    y = wrap(ctx, portfolio.about, 70, y + 68, 1040, 47) + 18
    ctx.strokeStyle = '#b4b4a9'; ctx.beginPath(); ctx.moveTo(68, y); ctx.lineTo(1132, y); ctx.stroke()

    y += 48
    ctx.fillStyle = '#425d50'; ctx.font = '20px monospace'; ctx.fillText('A FEW FRAMES FROM MY LIFE', 70, y)
    y += 26
    const photoY = y
    const photoHeight = 330
    const photoWidths = [490, 238, 238]
    const photoGap = 22
    let photoX = 70
    images.forEach((image, index) => {
      drawContainedImage(ctx, image, photoX, photoY, photoWidths[index], photoHeight)
      ctx.strokeStyle = '#b4b4a9'; ctx.lineWidth = 2; ctx.strokeRect(photoX, photoY, photoWidths[index], photoHeight)
      ctx.fillStyle = '#405348'; ctx.font = '17px monospace'; ctx.fillText(photos[index].caption.toUpperCase(), photoX, photoY + photoHeight + 28)
      photoX += photoWidths[index] + photoGap
    })
    y = photoY + photoHeight + 78

    ctx.strokeStyle = '#b4b4a9'; ctx.beginPath(); ctx.moveTo(68, y); ctx.lineTo(1132, y); ctx.stroke()
    y += 54
    ctx.fillStyle = '#26352f'; ctx.font = 'bold 43px sans-serif'; ctx.fillText('Away from the screen.', 70, y)
    ctx.fillStyle = '#49554d'; ctx.font = '31px sans-serif'
    y = wrap(ctx, portfolio.outsideOfCode, 70, y + 54, 1040, 43) + 14

    ctx.strokeStyle = '#b4b4a9'; ctx.beginPath(); ctx.moveTo(68, y); ctx.lineTo(1132, y); ctx.stroke()
    y += 52
    ctx.fillStyle = '#425d50'; ctx.font = '20px monospace'; ctx.fillText('EDUCATION', 70, y)
    ctx.fillStyle = '#26352f'; ctx.font = '32px sans-serif'
    y = wrap(ctx, portfolio.education, 70, y + 50, 1040, 42) + 20

    ctx.strokeStyle = '#b4b4a9'; ctx.beginPath(); ctx.moveTo(68, y); ctx.lineTo(1132, y); ctx.stroke()
    y += 52
    ctx.fillStyle = '#425d50'; ctx.font = '20px monospace'; ctx.fillText('TOOLS I WORK WITH', 70, y)
    ctx.fillStyle = '#26352f'; ctx.font = '28px sans-serif'
    y = wrap(ctx, portfolio.skills.join('  /  '), 70, y + 50, 1040, 40)
    y += 24
    ctx.fillStyle = '#59645b'; ctx.font = '18px monospace'; ctx.fillText('VINCENT YEN  /  TEXAS A&M UNIVERSITY', 70, y)
    maxScroll.current = Math.max(0, y + 44 - contentBottom)
    ctx.restore()

    ctx.fillStyle = '#e9e6db'; ctx.fillRect(24, pixelsHigh - 84, 1152, 60)
    ctx.strokeStyle = '#b4b4a9'; ctx.beginPath(); ctx.moveTo(48, pixelsHigh - 84); ctx.lineTo(1152, pixelsHigh - 84); ctx.stroke()
    ctx.fillStyle = '#59645b'; ctx.font = '17px monospace'
    ctx.fillText(maxScroll.current > 0 ? 'SCROLL OR DRAG TO KEEP READING' : 'PERSONAL PAGE  /  VINCENT YEN', 58, pixelsHigh - 46)
    if (maxScroll.current > 0) {
      ctx.fillStyle = '#aab0a5'; ctx.fillRect(1124, contentTop + scroll / maxScroll.current * (contentBottom - contentTop - 68), 5, 68)
    }
    texture.needsUpdate = true
  }, [surface, photos, images, pixelsHigh, selected, focused, scroll])

  return <>
    <mesh position={[0, 0, .055]} onClick={(event) => {
      event.stopPropagation()
      if (dragged.current) { dragged.current = false; return }
      if (!selected) { onOpen(); return }
      if (!event.uv) return
      const x = event.uv.x * 1200, y = (1 - event.uv.y) * pixelsHigh
      if (y < 110 && x > 900) onBack()
    }} onPointerOver={() => { cursor('pointer') }} onPointerOut={() => cursor('')}
    onWheel={(event) => { if (selected) { event.stopPropagation(); scrollBy(event.deltaY) } }}
    onPointerDown={(event) => { touch.current = event.clientY; dragged.current = false }}
    onPointerMove={(event) => { if (selected && event.buttons && touch.current !== null) {
      const delta = touch.current - event.clientY
      if (Math.abs(delta) > 2) dragged.current = true
      scrollBy(delta * 2); touch.current = event.clientY
    } }} onPointerUp={() => { touch.current = null }}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={surface.texture} roughness={.9} emissiveMap={surface.texture}
        emissive="#ffffff" emissiveIntensity={selected ? .18 : .08} />
    </mesh>
    <Html><div className="visually-hidden" onKeyDownCapture={(event) => {
      if (!selected) return
      if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); scrollBy(event.key === 'PageDown' ? 360 : 64) }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); scrollBy(event.key === 'PageUp' ? -360 : -64) }
    }}>
      <button autoFocus={selected} onClick={selected ? onBack : onOpen}>{selected ? 'Back to the shelf' : 'Open About Me'}</button>
      {selected && <section aria-label="About Vincent">
        <h2>About me</h2><p>{portfolio.about}</p>
        <div role="group" aria-label="Personal photos">{photos.map((photo) => <img key={photo.src} src={assetUrl(photo.src)} alt={photo.alt} />)}</div>
        <h3>Away from the screen</h3><p>{portfolio.outsideOfCode}</p>
        <h3>Education</h3><p>{portfolio.education}</p>
        <h3>Tools I work with</h3><ul>{portfolio.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
        <button onClick={() => scrollBy(360)}>Continue reading</button>
        <button onClick={() => scrollBy(-360)}>Read previous section</button>
      </section>}
    </div></Html>
  </>
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
  const imageTextures = useTexture(project.images.map((image) => assetUrl(image.src)))
  const images = useMemo(() => imageTextures.map((image) => image.image as HTMLImageElement), [imageTextures])
  const [scroll, setScroll] = useState(0)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const linkAreas = useRef<LinkArea[]>([])
  const maxScroll = useRef(0)
  const touch = useRef<number | null>(null)
  const dragged = useRef(false)
  const start = sheetPositions[index]
  useEffect(() => {
    imageTextures.forEach((texture) => { texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true })
  }, [imageTextures])
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
    ctx.save(); ctx.beginPath(); ctx.rect(52, 232, 600, 338); ctx.clip()
    drawContainedImage(ctx, images[0], 52, 232, 600, 338)
    ctx.restore()
    ctx.strokeStyle = '#91b8b9'; ctx.lineWidth = 2; ctx.strokeRect(52, 232, 600, 338)
    ctx.fillStyle = '#e7b880'; ctx.font = '19px monospace'; ctx.fillText('BUILD NOTES', 700, 256)
    ctx.fillStyle = '#bfd4cd'; ctx.font = '22px monospace'
    project.tools.forEach((tool, i) => ctx.fillText(`${String(i + 1).padStart(2, '0')} / ${tool}`, 700, 303 + i * 36))
    ctx.fillStyle = '#e7b880'; ctx.font = '19px monospace'; ctx.fillText('PROJECT OVERVIEW', 50, 620)
    ctx.fillStyle = '#e0e9dd'; ctx.font = '29px sans-serif'
    let y = wrap(ctx, project.summary, 50, 668, 1040, 43)
    y += 37; ctx.strokeStyle = '#60868e'; ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(1150, y); ctx.stroke()
    y += 46
    ctx.fillStyle = '#9fbfc0'; ctx.font = '20px monospace'; ctx.fillText('TECHNOLOGIES', 50, y)
    ctx.fillStyle = '#e0e9dd'; ctx.font = '28px sans-serif'; y = wrap(ctx, project.tools.join(' / '), 50, y + 44, 1040, 40)
    y += 18
    ctx.fillStyle = '#e7b880'; ctx.font = '19px monospace'; ctx.fillText('FIELD NOTES', 50, y)
    y += 46
    ctx.font = '25px sans-serif'; ctx.fillStyle = '#e0e9dd'
    project.highlights.forEach((highlight, noteIndex) => {
      ctx.fillStyle = '#9fbfc0'; ctx.font = '19px monospace'; ctx.fillText(`${String(noteIndex + 1).padStart(2, '0')} /`, 50, y)
      ctx.fillStyle = '#e0e9dd'; ctx.font = '25px sans-serif'
      y = wrap(ctx, highlight, 110, y, 1040, 36) + 5
    })
    const additionalImages = images.slice(1)
    if (additionalImages.length) {
      y += 24
      ctx.fillStyle = '#e7b880'; ctx.font = '19px monospace'; ctx.fillText('MORE PROJECT VIEWS', 50, y)
      y += 24
      const gap = 24
      const tileWidth = additionalImages.length === 1 ? 520 : (1100 - gap) / 2
      const tileHeight = 285
      const startX = additionalImages.length === 1 ? 50 : 50
      additionalImages.forEach((image, imageIndex) => {
        const x = startX + imageIndex * (tileWidth + gap)
        drawContainedImage(ctx, image, x, y, tileWidth, tileHeight)
        ctx.strokeStyle = '#60868e'; ctx.lineWidth = 2; ctx.strokeRect(x, y, tileWidth, tileHeight)
        ctx.fillStyle = '#9fbfc0'; ctx.font = '16px monospace'; ctx.fillText(`SCREEN 0${imageIndex + 2}`, x, y + tileHeight + 22)
      })
      y += tileHeight + 45
    }
    y += 14
    ctx.strokeStyle = '#60868e'; ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(1150, y); ctx.stroke()
    y += 42
    ctx.fillStyle = '#e7b880'; ctx.font = '19px monospace'; ctx.fillText('PROJECT LINKS', 50, y)
    y += 40
    linkAreas.current = []
    ctx.font = '22px monospace'
    project.links.forEach((link) => {
      ctx.fillStyle = '#edc08d'; ctx.fillText(`${link.label.toUpperCase()}  ↗`, 50, y)
      linkAreas.current.push({ top: y - 27, bottom: y + 8, href: link.url })
      y += 48
    })
    y += 24
    ctx.fillStyle = '#91b4b6'; ctx.font = '18px monospace'; ctx.fillText(`END OF SHEET 0${index + 1} / ${project.title.toUpperCase()}`, 50, y)
    maxScroll.current = Math.max(0, y + 25 - 765)
    ctx.restore()
    ctx.fillStyle = '#102a34'; ctx.fillRect(35, 775, 1130, 32)
    ctx.fillStyle = '#9fbdbb'; ctx.font = '17px monospace'; ctx.fillText(selected ? 'SCROLL PAPER  /  DRAG TO READ  /  ESC TO RETURN' : 'SELECT THIS DRAWING TO EXPLORE', 50, 797)
    if (selected && maxScroll.current > 0) { ctx.fillStyle = '#c4cdb7'; ctx.fillRect(1150, 110 + scroll / maxScroll.current * 525, 4, 90) }
    texture.needsUpdate = true
  }, [project, index, selected, scroll, surface, keyboardFocus, images])

  const changeScroll = (delta: number) => setScroll((value) => THREE.MathUtils.clamp(value + delta, 0, maxScroll.current))
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (dragged.current) { dragged.current = false; return }
    if (!selected) { if (enabled) onSelect(); return }
    if (!event.uv) return
    const x = event.uv.x * 1200, y = (1 - event.uv.y) * 840
    if (y < 88 && x > 915) { onBack(); return }
    if (y > 92 && y < 765) {
      const link = linkAreas.current.find((area) => y + scroll >= area.top && y + scroll <= area.bottom)
      if (link) window.open(link.href, '_blank', 'noopener,noreferrer')
    }
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

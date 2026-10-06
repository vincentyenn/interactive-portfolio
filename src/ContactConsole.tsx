import { useEffect, useState } from 'react'
import { Html, RoundedBox } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import portfolio from '../content/portfolio.json'
import { useSurface, wrap } from './ObjectSurfaces'
import { CONTACT_CONSOLE_POSITION } from './DoorPosterFixes'
import type { Focus } from './LoftScene'

const WIDTH = 900
const HEIGHT = 1500
const links = [
  { label: 'LinkedIn', detail: 'Start a conversation', href: portfolio.links.linkedin, top: 620, bottom: 790 },
  { label: 'GitHub', detail: 'See my code', href: portfolio.links.github, top: 810, bottom: 980 },
  { label: 'Devpost', detail: 'Explore hackathon work', href: portfolio.links.devpost, top: 1000, bottom: 1170 },
] as const

function DoorPlaque() {
  const { ctx, texture } = useSurface(512, 160)
  useEffect(() => {
    ctx.fillStyle = '#383936'; ctx.fillRect(0, 0, 512, 160)
    ctx.strokeStyle = '#a68b64'; ctx.lineWidth = 5; ctx.strokeRect(8, 8, 496, 144)
    ctx.fillStyle = '#d7c4a2'; ctx.font = '45px monospace'
    ctx.fillText('STUDIO / 01', 78, 99)
    texture.needsUpdate = true
  }, [ctx, texture])
  return <group name="studio door plaque" position={[7.73, 2.21, -4.2]} rotation={[0, -Math.PI / 2, 0]}>
    <RoundedBox args={[.34, .105, .014]} radius={.004} castShadow>
      <meshStandardMaterial color="#353735" metalness={.5} roughness={.56} />
    </RoundedBox>
    <mesh position={[0, 0, .009]}>
      <planeGeometry args={[.31, .085]} />
      <meshStandardMaterial map={texture} roughness={.68} />
    </mesh>
  </group>
}

export default function ContactConsole({ active, reducedMotion, onFocus }: {
  active: boolean, reducedMotion: boolean, onFocus: (focus: Focus) => void
}) {
  const { ctx, texture } = useSurface(WIDTH, HEIGHT)
  const [ready, setReady] = useState(active && reducedMotion)

  useEffect(() => {
    setReady(active && reducedMotion)
    if (!active || reducedMotion) return
    const timer = window.setTimeout(() => setReady(true), 420)
    return () => window.clearTimeout(timer)
  }, [active, reducedMotion])

  useEffect(() => {
    ctx.fillStyle = '#07100f'; ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.strokeStyle = '#273d37'; ctx.lineWidth = 3; ctx.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40)
    if (!active || !ready) {
      ctx.fillStyle = '#ae865a'; ctx.fillRect(414, 1324, 72, 7)
      texture.needsUpdate = true
      return
    }

    ctx.fillStyle = '#12231d'; ctx.fillRect(24, 24, WIDTH - 48, 142)
    ctx.fillStyle = '#d2dfd2'; ctx.font = '31px monospace'; ctx.fillText('V/Y  /  CONTACT', 52, 102)
    ctx.textAlign = 'right'; ctx.fillStyle = '#e5b681'; ctx.fillText('[ ROOM ]', 850, 102); ctx.textAlign = 'left'

    ctx.fillStyle = '#e9ede3'; ctx.font = 'bold 90px sans-serif'
    ctx.fillText('Let’s make', 55, 281)
    ctx.fillText('something.', 55, 380)
    ctx.fillStyle = '#b7c7bb'; ctx.font = '42px sans-serif'
    wrap(ctx, 'Have a project, role, or idea in mind? Reach out and let’s talk.', 58, 464, 780, 56)

    ctx.strokeStyle = '#4b695a'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(55, 583); ctx.lineTo(845, 583); ctx.stroke()
    links.forEach((link, index) => {
      ctx.fillStyle = index === 0 ? '#162a21' : '#0f1b18'
      ctx.fillRect(44, link.top, 812, link.bottom - link.top)
      ctx.strokeStyle = index === 0 ? '#b18b60' : '#395649'
      ctx.strokeRect(45, link.top + 1, 810, link.bottom - link.top - 2)
      ctx.fillStyle = index === 0 ? '#e8bf8a' : '#d9e5d9'
      ctx.font = 'bold 54px sans-serif'
      ctx.fillText(link.label, 78, link.top + 82)
      ctx.fillStyle = '#9fb2a4'; ctx.font = '31px sans-serif'
      ctx.fillText(link.detail, 79, link.top + 133)
      ctx.fillStyle = '#e8bf8a'; ctx.font = '56px sans-serif'
      ctx.textAlign = 'right'; ctx.fillText('↗', 823, link.top + 94); ctx.textAlign = 'left'
    })

    ctx.strokeStyle = '#395649'; ctx.beginPath(); ctx.moveTo(55, 1270); ctx.lineTo(845, 1270); ctx.stroke()
    ctx.fillStyle = '#96a99a'; ctx.font = '26px monospace'
    ctx.fillText('VINCENT YEN  /  STUDIO 01', 56, 1345)
    ctx.fillStyle = '#e0b27d'; ctx.beginPath(); ctx.arc(825, 1337, 9, 0, Math.PI * 2); ctx.fill()
    texture.needsUpdate = true
  }, [active, ready, ctx, texture])

  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (!active) { onFocus('contact'); return }
    if (!event.uv || !ready) return
    const x = event.uv.x * WIDTH
    const y = (1 - event.uv.y) * HEIGHT
    if (y < 175 && x > 610) { onFocus('room'); return }
    const link = links.find((entry) => y >= entry.top && y <= entry.bottom)
    if (link) window.open(link.href, '_blank', 'noopener,noreferrer')
  }

  return <>
    <DoorPlaque />
    <group name="wall contact console" position={CONTACT_CONSOLE_POSITION} rotation={[0, -Math.PI / 2, 0]}>
      <RoundedBox args={[.88, 1.44, .12]} radius={.025} castShadow receiveShadow>
        <meshStandardMaterial color="#222b28" metalness={.58} roughness={.46} />
      </RoundedBox>
      <RoundedBox args={[.76, 1.24, .014]} radius={.01} position={[-.04, 0, .066]}>
        <meshStandardMaterial color="#090e0d" metalness={.25} roughness={.32} />
      </RoundedBox>
      <mesh position={[-.04, 0, .076]} onClick={click}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}>
        <planeGeometry args={[.68, 1.16]} />
        <meshStandardMaterial map={texture} roughness={.39} metalness={.09}
          emissiveMap={texture} emissive="#a6c6ac" emissiveIntensity={active && ready ? .58 : .07} />
      </mesh>
      {([[-.39, -.65], [.38, -.65], [-.39, .65], [.38, .65]] as const).map(([x, y]) =>
        <mesh key={`${x}-${y}`} position={[x, y, .07]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[.009, .009, .004, 10]} />
          <meshStandardMaterial color="#8d8f85" metalness={.7} roughness={.42} />
        </mesh>)}
      <pointLight position={[0, .3, .3]} intensity={active ? 1.8 : .38} color="#e7bc86" distance={1.35} decay={2} />
      {active && <Html><nav className="visually-hidden" aria-label="Contact console links">
        <button autoFocus type="button" onClick={() => onFocus('room')}>Back to the loft</button>
        <h2>Let’s make something.</h2>
        <p>Have a project, role, or idea in mind? Reach out and let’s talk.</p>
        {links.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}: {link.detail}</a>)}
      </nav></Html>}
    </group>
  </>
}

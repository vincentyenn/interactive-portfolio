import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, BufferGeometry, EdgesGeometry, Group, LineBasicMaterial, LineSegments, MathUtils, Vector3 } from 'three'

type Point = [number, number, number]
type Outline = { center: Point; size: Point; color?: string }

const boxEdges = new EdgesGeometry(new BoxGeometry(1, 1, 1))
const sage = '#89b2a3'
const warm = '#e0b889'
const pale = '#c8d6c7'

// The studio's actual spatial landmarks, simplified to inexpensive edge geometry.
const outlines: Outline[] = [
  { center: [0, 0, 0], size: [12.4, .06, 9.7] },
  { center: [-6.16, 3.15, 0], size: [.08, 6.3, 9.7] },
  { center: [6.16, 3.15, 0], size: [.08, 6.3, 9.7] },
  { center: [0, 3.15, -4.48], size: [12.4, 6.3, .08] },
  { center: [0, 6.28, 0], size: [12.4, .08, 9.7] },
  ...[-4.8, -2.3, .2, 2.7, 5.2].map((x): Outline => ({ center: [x, 5.95, 0], size: [.12, .32, 9.5] })),
  { center: [-5.49, 3.13, -.65], size: [1.18, .22, 7.65], color: warm },
  { center: [-3.25, 3.13, -3.56], size: [3.3, .22, 1.82], color: warm },
  { center: [-3.25, 3.13, 2.71], size: [3.3, .22, .93], color: warm },
  { center: [-1.01, 3.13, -2.94], size: [1.18, .22, .92], color: warm },
  { center: [-1.72, .81, -2.11], size: [3.35, .12, 1.46], color: warm },
  { center: [-1.71, 1.63, -2.43], size: [1.85, 1.18, .1], color: pale },
  { center: [-1.71, 1.12, -2.51], size: [.08, .42, .08], color: pale },
  { center: [2.28, .91, 1.04], size: [5.45, .17, 2.77], color: warm },
  { center: [2.74, 2.63, -4.27], size: [3.14, 2.2, .12], color: pale },
  { center: [5.21, 1.55, -3.21], size: [1.55, 3.13, .18], color: warm },
  ...[.68, 1.42, 2.16].map((y): Outline => ({ center: [-4.72, y, -2.67], size: [2.08, .09, .62], color: warm })),
  ...[-4.5, -2.75, -1].map((x): Outline => ({ center: [x, 4.62, -4.41], size: [1.42, 2.56, .07], color: pale })),
  ...Array.from({ length: 15 }, (_, i): Outline => {
    const t = i / 14
    return { center: [-4.2 + 2.8 * t, .19 + 3.01 * t, 1.95 - 4.2 * t], size: [1.26, .12, .46], color: warm }
  }),
  ...[-4.7, -.2, 4.5].flatMap((x): Outline[] => [-.05, 2.13].map((z): Outline => ({ center: [x, .43, z], size: [.1, .85, .1], color: warm }))),
]

function Rail({ start, end, color = sage }: { start: Point; end: Point; color?: string }) {
  const geometry = useMemo(() => new BufferGeometry().setFromPoints([new Vector3(...start), new Vector3(...end)]), [start, end])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <lineSegments geometry={geometry} userData={{ waveX: (start[0] + end[0]) / 2 }}>
    <lineBasicMaterial color={color} transparent opacity={.35} depthWrite={false} />
  </lineSegments>
}

function Studio({ revealing }: { revealing: boolean }) {
  const group = useRef<Group>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const materialRefs = useRef<LineSegments[]>([])
  const revealStart = useRef<number | null>(null)

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth - .5) * 2
      pointer.current.y = (event.clientY / window.innerHeight - .5) * 2
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    if (revealing && revealStart.current === null) revealStart.current = clock.elapsedTime
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, pointer.current.x * .045, 3, delta)
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, pointer.current.y * .02, 3, delta)
    const phase = revealStart.current === null
      ? (clock.elapsedTime % 2) / 2
      : Math.min(1, (clock.elapsedTime - revealStart.current) / .95)
    const crest = -6.5 + phase * 13
    for (const line of materialRefs.current) {
      const material = line.material as LineBasicMaterial
      const waveX = line.userData.waveX as number
      const distance = Math.abs(waveX - crest)
      material.opacity = .27 + .62 * Math.exp(-distance * distance / 2.1)
    }
  })

  const register = (line: LineSegments | null) => {
    if (line && !materialRefs.current.includes(line)) materialRefs.current.push(line)
  }

  return <group ref={group} position={[0, -.1, 0]}>
    {outlines.map(({ center, size, color }, i) => <lineSegments
      key={i} ref={register} geometry={boxEdges} position={center} scale={size} userData={{ waveX: center[0] }}>
      <lineBasicMaterial color={color ?? sage} transparent opacity={.35} depthWrite={false} />
    </lineSegments>)}
    <Rail start={[-3.54, .91, 1.95]} end={[-.74, 3.92, -2.48]} color={pale} />
    <Rail start={[-5.1, .11, 1.95]} end={[-2.3, 3.12, -2.25]} />
    <Rail start={[-1.58, 4.18, -4.25]} end={[-1.58, 4.18, 3.02]} />
    <Rail start={[-5.1, 4.16, -2.65]} end={[-5.1, 4.16, 2.25]} />
    {[-4.12, -3.25, 2.84].map((z) => <Rail key={z} start={[-1.58, 3.25, z]} end={[-1.58, 4.18, z]} />)}
  </group>
}

/** A perspective 3D sketch of the studio that reveals the loaded room. */
export default function StudioWireframeLoader({ revealing, reducedMotion }: { revealing: boolean; reducedMotion: boolean }) {
  return <div className={`loft-loader ${revealing ? 'is-revealing' : ''}`} aria-hidden="true">
    <Canvas className="loft-loader-canvas" camera={{ position: [1.8, 4.8, 16.5], fov: 48, near: .1, far: 80 }}
      onCreated={({ camera }) => camera.lookAt(0, 2.7, -.3)}
      dpr={[1, 1.25]} frameloop={reducedMotion ? 'demand' : 'always'} gl={{ antialias: true, powerPreference: 'low-power' }}>
      <color attach="background" args={['#0b1515']} />
      <Studio revealing={revealing} />
    </Canvas>
    <div className="loft-loader-final-pulse" />
  </div>
}

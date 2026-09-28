import { useEffect, useMemo, useRef, useState } from 'react'
import { Html, RoundedBox, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Focus } from './LoftScene'
import { useSurface } from './ObjectSurfaces'

function RoomMaterial({ textile = false }: { textile?: boolean }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/loft-room.glb`)
  const material = useMemo(() => {
    let found: THREE.Material | undefined
    scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || found) return
      const materials = Array.isArray(node.material) ? node.material : [node.material]
      found = materials.find((entry) => entry.name === (textile ? 'studio woven floor textile' : 'oak veneer'))
    })
    return found
  }, [scene, textile])
  return material ? <primitive object={material} attach="material" /> : <meshStandardMaterial color="#62523d" roughness={.85} />
}

function ReadingChair({ onClick }: { onClick: () => void }) {
  return <mesh position={[-6.83, .65, -.65]} onClick={(event) => { event.stopPropagation(); onClick() }}
    onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
    <boxGeometry args={[1.5, 1.3, 1.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
  </mesh>
}

function Stereo({ playing, error, toggle, next, previous, currentTrack, currentArtist, trackNumber, trackCount, reducedMotion }: {
  playing: boolean, error: string, toggle: () => void, next: () => void, previous: () => void,
  currentTrack: string, currentArtist: string, trackNumber: number, trackCount: number, reducedMotion: boolean
}) {
  const { ctx, texture } = useSurface(768, 190)
  const [focused, setFocused] = useState(false)
  const meters = useRef<THREE.Group>(null)
  useEffect(() => {
    ctx.fillStyle = '#0d1b19'; ctx.fillRect(0, 0, 768, 190)
    ctx.fillStyle = error ? '#eaa587' : playing ? '#c1dec9' : '#6b8175'
    ctx.font = '23px monospace'; ctx.fillText('LOFT / SELECTOR', 30, 43)
    ctx.fillStyle = '#d8d7ca'; ctx.font = 'bold 23px monospace'
    const title = currentTrack.length > 29 ? `${currentTrack.slice(0, 27)}…` : currentTrack
    ctx.fillText(error ? 'LOCAL PREVIEW' : title || 'MUSIC UNAVAILABLE', 30, 79)
    ctx.fillStyle = '#94a298'; ctx.font = '17px monospace'
    const artist = currentArtist.length > 44 ? `${currentArtist.slice(0, 42)}…` : currentArtist
    ctx.fillText(error ? 'CHECK LOCAL TRACKS' : artist, 30, 105)
    ctx.fillStyle = error ? '#eaa587' : playing ? '#c1dec9' : '#91a095'
    ctx.font = '19px monospace'
    ctx.fillText(`${String(trackNumber).padStart(2, '0')} / ${String(trackCount).padStart(2, '0')}  ·  ${playing ? 'PLAYING' : 'PAUSED'}`, 30, 137)
    ctx.fillStyle = '#91a095'; ctx.font = '16px monospace'
    ctx.fillText('CLICK TO ' + (playing ? 'PAUSE' : 'PLAY'), 30, 163)
    texture.needsUpdate = true
  }, [playing, error, currentTrack, currentArtist, trackNumber, trackCount, ctx, texture])
  useFrame(({ clock }) => {
    meters.current?.children.forEach((bar, i) => {
      bar.scale.y = playing ? reducedMotion ? .7 : .3 + .6 * Math.abs(Math.sin(clock.elapsedTime * 1.5 + i * .8)) : .12
    })
  })
  const previousShape = useMemo(() => {
    const shape = new THREE.Shape(); shape.moveTo(0, .025); shape.lineTo(-.025, 0); shape.lineTo(0, -.025); shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }, [])
  const nextShape = useMemo(() => {
    const shape = new THREE.Shape(); shape.moveTo(0, .025); shape.lineTo(.025, 0); shape.lineTo(0, -.025); shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }, [])
  return <group position={[-5.75, .87, -2.4]} onClick={(event) => { event.stopPropagation(); toggle() }}
    onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
    <RoundedBox args={[1.22, .42, .42]} radius={.035} castShadow><RoomMaterial /></RoundedBox>
    <RoundedBox args={[1.16, .35, .022]} radius={.015} position={[0, 0, .213]}><meshStandardMaterial color={focused ? '#b69a68' : '#272e2b'} metalness={.55} roughness={.42} /></RoundedBox>
    <mesh position={[-.14, .025, .231]}><planeGeometry args={[.62, .154]} /><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={playing ? .65 : .15} /></mesh>
    <group ref={meters} position={[-.4, -.116, .234]}>{Array.from({ length: 12 }, (_, i) =>
      <mesh key={i} position={[i * .042, 0, 0]}><planeGeometry args={[.019, .045]} /><meshBasicMaterial color={playing ? '#a9cfb0' : '#38433a'} /></mesh>)}</group>
    <mesh position={[.42, -.015, .25]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.092, .092, .065, 40]} /><meshStandardMaterial color="#b9b4a6" roughness={.3} metalness={.82} /></mesh>
    <mesh position={[.28, -.13, .244]} geometry={previousShape} onClick={(event) => { event.stopPropagation(); previous() }}>
      <meshBasicMaterial color="#b9c5b9" side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[.54, -.13, .244]} geometry={nextShape} onClick={(event) => { event.stopPropagation(); next() }}>
      <meshBasicMaterial color="#b9c5b9" side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[.42, .126, .234]}><sphereGeometry args={[.018, 12, 8]} /><meshBasicMaterial color={error ? '#e98a6e' : playing ? '#b8e3ad' : '#4d594e'} /></mesh>
    {[-.95, .95].map((x) => <group key={x} position={[x, .02, -.02]}>
      <RoundedBox args={[.43, .49, .38]} radius={.025} castShadow><RoomMaterial /></RoundedBox>
      <mesh position={[0, 0, .197]}><planeGeometry args={[.37, .43]} /><meshStandardMaterial color="#292e2b" roughness={.98} /></mesh>
      <mesh position={[0, -.035, .207]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.137, .137, .018, 40]} /><meshStandardMaterial color="#444b44" roughness={.9} /></mesh>
      <mesh position={[0, -.035, .22]}><sphereGeometry args={[.06, 20, 12]} /><meshStandardMaterial color="#242925" roughness={.7} /></mesh>
      <mesh position={[0, .145, .208]}><circleGeometry args={[.038, 24]} /><meshStandardMaterial color="#7b8075" roughness={.5} metalness={.4} /></mesh>
    </group>)}
    <Html><div className="visually-hidden">
      <button aria-pressed={playing} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onClick={(event) => { event.stopPropagation(); toggle() }}>{playing ? `Pause ${currentTrack}` : `Play ${currentTrack || 'local music preview'}`}</button>
      <button onClick={(event) => { event.stopPropagation(); previous() }}>Previous track</button>
      <button onClick={(event) => { event.stopPropagation(); next() }}>Next track</button>
      <span role="status">{error || (playing ? `Playing ${currentTrack}` : currentTrack ? `Paused at ${currentTrack}` : 'Music preview unavailable in this build')}</span>
    </div></Html>
  </group>
}

function Mug({ reducedMotion }: { reducedMotion: boolean }) {
  const wisps = useRef<THREE.Group>(null)
  const { ctx, texture } = useSurface(64, 128)
  useEffect(() => {
    ctx.clearRect(0, 0, 64, 128)
    ctx.save(); ctx.scale(1, 2)
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 31)
    gradient.addColorStop(0, 'rgba(229,226,216,.65)')
    gradient.addColorStop(.4, 'rgba(229,226,216,.2)')
    gradient.addColorStop(1, 'rgba(229,226,216,0)')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64)
    ctx.restore(); texture.needsUpdate = true
  }, [ctx, texture])
  useFrame(({ clock }) => {
    if (reducedMotion) return
    wisps.current?.children.forEach((child, i) => {
      const phase = (clock.elapsedTime * .19 + i / 7) % 1
      child.position.set(Math.sin(phase * 5 + i) * .023, .12 + phase * .31, Math.cos(phase * 4 + i) * .013)
      child.scale.set(.055 + phase * .07, .1 + phase * .16, 1)
      ;((child as THREE.Sprite).material as THREE.SpriteMaterial).opacity = Math.sin(phase * Math.PI) * .17
    })
  })
  return <group position={[-5.8, .575, -.55]}>
    <mesh castShadow><cylinderGeometry args={[.075, .061, .13, 32]} /><meshStandardMaterial color="#c5ba9d" roughness={.58} /></mesh>
    <mesh position={[0, .067, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.062, 32]} /><meshStandardMaterial color="#392c23" roughness={.22} /></mesh>
    <mesh position={[.078, .002, 0]}><torusGeometry args={[.044, .012, 10, 24]} /><meshStandardMaterial color="#c5ba9d" roughness={.58} /></mesh>
    {!reducedMotion && <group ref={wisps}>{Array.from({ length: 7 }, (_, i) => <sprite key={i} scale={[.05, .1, 1]}>
      <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} />
    </sprite>)}</group>}
  </group>
}

export default function ListeningNook({ focus, onFocus, playing, error, toggle, next, previous, currentTrack, currentArtist, trackNumber, trackCount, reducedMotion }: {
  focus: Focus, onFocus: (focus: Focus) => void, playing: boolean, error: string, toggle: () => void,
  next: () => void, previous: () => void, currentTrack: string, currentArtist: string,
  trackNumber: number, trackCount: number, reducedMotion: boolean
}) {
  const [lampOn, setLampOn] = useState(true)
  return <group name="under mezzanine listening nook">
    <ReadingChair onClick={() => onFocus('nook')} />
    <RoundedBox args={[2.85, .032, 3.6]} radius={.014} position={[-6.1, .022, -.55]} receiveShadow><RoomMaterial textile /></RoundedBox>
    <mesh position={[-5.8, .47, -.5]} scale={[1, 1, .8]} castShadow receiveShadow><cylinderGeometry args={[.64, .64, .08, 64]} /><RoomMaterial /></mesh>
    {[-.32, .32].map((z) => <mesh key={z} position={[-5.8, .22, -.5 + z]} castShadow><boxGeometry args={[.68, .44, .045]} /><meshStandardMaterial color="#272c27" roughness={.6} metalness={.4} /></mesh>)}
    <Mug reducedMotion={reducedMotion} />
    {[0, 1].map((i) => <RoundedBox key={i} args={[.35, .026, .26]} radius={.003} position={[-5.65, .524 + i * .03, -.23]} rotation={[0, -.2 + i * .12, 0]}><meshStandardMaterial color={i ? '#d0c6ae' : '#394c47'} roughness={.95} /></RoundedBox>)}
    <RoundedBox args={[2.6, .43, .65]} radius={.025} position={[-5.75, .39, -2.4]} castShadow><RoomMaterial /></RoundedBox>
    {[-6.78, -4.72].map((x) => <mesh key={x} position={[x, .09, -2.4]}><boxGeometry args={[.08, .18, .5]} /><meshStandardMaterial color="#282e2a" metalness={.5} roughness={.55} /></mesh>)}
    {[-6.39, -5.11].map((x) => <RoundedBox key={x} args={[1.19, .32, .025]} radius={.008} position={[x, .39, -2.061]}><RoomMaterial /></RoundedBox>)}
    <Stereo playing={playing} error={error} toggle={toggle} next={next} previous={previous}
      currentTrack={currentTrack} currentArtist={currentArtist} trackNumber={trackNumber}
      trackCount={trackCount} reducedMotion={reducedMotion} />
    <group position={[-7.58, 1.96, -.7]} onClick={(event) => { event.stopPropagation(); setLampOn((value) => !value) }}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.105, .105, .08, 32]} /><meshStandardMaterial color="#272c27" metalness={.6} roughness={.4} /></mesh>
      <mesh position={[.19, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.017, .017, .35, 12]} /><meshStandardMaterial color="#736952" metalness={.65} roughness={.35} /></mesh>
      <mesh position={[.38, -.09, 0]}><coneGeometry args={[.19, .24, 40, 1, true]} /><meshStandardMaterial color="#39443b" side={THREE.DoubleSide} roughness={.6} /></mesh>
      <mesh position={[.38, -.19, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[.17, 32]} /><meshStandardMaterial color="#ded0ad" emissive="#ffc987" emissiveIntensity={lampOn ? 1.3 : 0} side={THREE.DoubleSide} /></mesh>
    </group>
    <pointLight position={[-7.1, 1.7, -.7]} intensity={lampOn ? 2.8 : 0} distance={4.5} color="#ffdbab" decay={2} />
    <pointLight position={[-5.45, 2.7, -2.3]} intensity={7} distance={5.2} color="#f7d8b0" decay={2} />
    {focus === 'nook' && <Html position={[-7.2, 1.7, -.7]}><div className="visually-hidden"><button aria-pressed={lampOn} onClick={() => setLampOn((value) => !value)}>Toggle listening nook lamp</button></div></Html>}
  </group>
}

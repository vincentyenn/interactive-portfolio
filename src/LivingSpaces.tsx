import { useRef, useState, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { Focus } from './LoftScene'
import ListeningNook from './ListeningNook'
import { useMusicPlayer } from './useMusicPlayer'
import type { Point } from './loftLayout'

function ObjectAction({ position, label, onClick, pressed, children }: {
  position: Point, label: string, onClick: () => void, pressed?: boolean, children?: ReactNode
}) {
  return <group position={position}>
    {children}
    <Html center position={[0, .28, 0]} zIndexRange={[5, 4]}>
      <button className="room-object-action" aria-pressed={pressed}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); onClick() }}>{label}</button>
    </Html>
  </group>
}

export default function LivingSpaces({ focus, onFocus, reducedMotion, mobile }: {
  focus: Focus, onFocus: (focus: Focus) => void, reducedMotion: boolean, mobile: boolean
}) {
  const [readingLamp, setReadingLamp] = useState(true)
  const [floorLamp, setFloorLamp] = useState(true)
  const { playing: recordPlaying, error: audioError, currentTrack, index, trackCount, toggle: toggleRecord,
    next: nextTrack, previous: previousTrack } = useMusicPlayer()
  const recordRef = useRef<Group>(null)
  useFrame((_, delta) => {
    if (recordRef.current && recordPlaying && !reducedMotion) recordRef.current.rotation.y += delta * Math.PI * 1.1
  })
  const toggleLamp = () => setFloorLamp((on) => !on)
  return <group name="living area interactions">
    <ListeningNook focus={focus} onFocus={onFocus} playing={recordPlaying} error={audioError} toggle={toggleRecord}
      next={nextTrack} previous={previousTrack} currentTrack={currentTrack?.title ?? ''}
      currentArtist={currentTrack?.artist ?? ''}
      trackNumber={trackCount ? index + 1 : 0} trackCount={trackCount} reducedMotion={reducedMotion} />
    <pointLight position={[-3.92, 4.35, -5.12]} color="#ffd39b" intensity={readingLamp ? 6 : 0} distance={4} decay={2} />
    <pointLight position={[-3.1, 1.62, 11.45]} color="#ffd39b" intensity={floorLamp ? 12 : 0} distance={6} decay={2} />
    <pointLight position={[.5, 4.9, 10.6]} color="#f6d9b8" intensity={12} distance={9} decay={2} />
    <pointLight position={[-4.8, 5.4, -4.6]} color="#f6d9b8" intensity={5} distance={6} decay={2} />
    <mesh position={[-3.1, 1.65, 11.45]} onClick={focus === 'lounge' ? toggleLamp : undefined}>
      <sphereGeometry args={[.075, 16, 12]} />
      <meshStandardMaterial color="#e7d5ae" emissive="#ffc58c" emissiveIntensity={floorLamp ? 2 : 0} />
    </mesh>
    <group ref={recordRef} position={[4.68, 1.012, 11.6]} onClick={focus === 'lounge' ? (event) => { event.stopPropagation(); toggleRecord() } : undefined}>
      <mesh><cylinderGeometry args={[.225, .225, .013, 64]} /><meshStandardMaterial color="#191c1c" roughness={.28} metalness={.25} /></mesh>
      {[.12, .15, .18, .207].map((radius) => <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, .009, 0]}>
        <torusGeometry args={[radius, .0015, 4, 64]} /><meshStandardMaterial color="#44453e" roughness={.35} />
      </mesh>)}
      <mesh position={[0, .01, 0]}><cylinderGeometry args={[.069, .069, .007, 32]} /><meshStandardMaterial color="#b38f59" roughness={.8} /></mesh>
      <mesh position={[.04, .015, 0]}><boxGeometry args={[.018, .002, .044]} /><meshStandardMaterial color="#eee2c1" /></mesh>
    </group>
    {focus === 'upstairs' && <>
      <ObjectAction position={[-3.92, 4.64, -5.12]} label={readingLamp ? 'Reading lamp · on' : 'Reading lamp · off'}
        pressed={readingLamp} onClick={() => setReadingLamp((on) => !on)} />
      <ObjectAction position={[-4.6, 4.14, -4.7]} label="Open my journal ↗" onClick={() => onFocus('about')} />
    </>}
    {focus === 'lounge' && <>
      <ObjectAction position={[mobile ? -1.65 : -3.1, 2.1, 11.45]} label={floorLamp ? 'Lamp · on' : 'Lamp · off'} pressed={floorLamp} onClick={toggleLamp} />
      <ObjectAction position={[mobile ? 3.15 : 4.8, 1.1, 11.6]}
        label={recordPlaying ? `Pause · ${currentTrack?.title ?? 'music'}` : `Play · ${currentTrack?.title ?? 'music'}`}
        pressed={recordPlaying} onClick={toggleRecord} />
      <ObjectAction position={[-.38, .8, 9.92]} label="Browse the project archive ↗" onClick={() => onFocus('projects')} />
    </>}
  </group>
}

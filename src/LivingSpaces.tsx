import { useState, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
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
  const toggleLamp = () => setFloorLamp((on) => !on)
  return <group name="living area interactions">
    <ListeningNook focus={focus} onFocus={onFocus} playing={recordPlaying} error={audioError} toggle={toggleRecord}
      next={nextTrack} previous={previousTrack} currentTrack={currentTrack?.title ?? ''}
      currentArtist={currentTrack?.artist ?? ''}
      trackNumber={trackCount ? index + 1 : 0} trackCount={trackCount} reducedMotion={reducedMotion} />
    <pointLight position={[-3.92, 4.35, -5.12]} color="#ffd39b" intensity={readingLamp ? 6 : 0} distance={4} decay={2} />
    <pointLight position={[4.42, 1.62, 11.1]} color="#ffd39b" intensity={floorLamp ? 12 : 0} distance={6} decay={2} />
    <pointLight position={[.5, 4.9, 10.6]} color="#f6d9b8" intensity={12} distance={9} decay={2} />
    <pointLight position={[-4.8, 5.4, -4.6]} color="#f6d9b8" intensity={5} distance={6} decay={2} />
    <mesh position={[4.42, 1.65, 11.1]} onClick={focus === 'lounge' ? toggleLamp : undefined}>
      <sphereGeometry args={[.075, 16, 12]} />
      <meshStandardMaterial color="#e7d5ae" emissive="#ffc58c" emissiveIntensity={floorLamp ? 2 : 0} />
    </mesh>
    {focus === 'lounge' && <mesh position={[-.55, .5, 9.67]}
      onClick={(event) => { event.stopPropagation(); onFocus('about') }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}>
      <boxGeometry args={[.74, .07, .53]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>}
    {focus === 'upstairs' && <>
      <ObjectAction position={[-3.92, 4.64, -5.12]} label={readingLamp ? 'Reading lamp · on' : 'Reading lamp · off'}
        pressed={readingLamp} onClick={() => setReadingLamp((on) => !on)} />
      <ObjectAction position={[-4.6, 4.14, -4.7]} label="Open my journal ↗" onClick={() => onFocus('about')} />
    </>}
    {focus === 'lounge' && <>
      <ObjectAction position={[mobile ? 4.05 : 4.42, 2.06, 11.1]} label={floorLamp ? 'Lamp · on' : 'Lamp · off'} pressed={floorLamp} onClick={toggleLamp} />
      <ObjectAction position={[-.55, .67, 9.67]} label="Photo book ↗" onClick={() => onFocus('about')} />
    </>}
  </group>
}

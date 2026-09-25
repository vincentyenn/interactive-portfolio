import React, { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'

export type Focus = 'room' | 'computer' | 'projects' | 'experience' | 'about' | 'contact'
type Props = {
  focus: Focus
  selectedProject: number | null
  reducedMotion: boolean
  mobile: boolean
  onFocus: (focus: Focus) => void
  onProject: (index: number) => void
  onReady: () => void
  onError: () => void
}

type CameraMark = {
  position: [number, number, number]
  target: [number, number, number]
  up?: [number, number, number]
  fov?: number
}

const marks: Record<Focus, CameraMark> = {
  room: { position: [0.2, 3.3, 8.6], target: [0, 2.15, -0.8], fov: 46 },
  computer: { position: [-1.64, 1.9, 0.18], target: [-1.72, 1.58, -2.42], fov: 41 },
  projects: { position: [3.8, 8.2, 1.04], target: [3.8, 0.92, 1.04], up: [0, 0, -1], fov: 67 },
  experience: { position: [2.75, 2.7, -0.6], target: [2.74, 2.63, -4.2], fov: 42 },
  about: { position: [-3.98, 1.96, 0.2], target: [-4.08, 1.54, -2.67], fov: 43 },
  contact: { position: [4.85, 2.06, 0.19], target: [5.18, 1.9, -3.12], fov: 42 },
}

const mobileMarks: Partial<Record<Focus, CameraMark>> = {
  room: { position: [0.8, 3.4, 11.3], target: [0.4, 2.1, -0.6], fov: 46 },
  projects: { position: [2.28, 8.2, 3.5], target: [2.28, 0.92, 3.5], up: [0, 0, -1], fov: 82 },
  computer: { position: [-1.64, 2.4, 2.9], target: [-1.72, 0.65, -2.42], fov: 55 },
  experience: { position: [2.74, 3, 1.4], target: [2.74, 1.2, -4.2], fov: 75 },
  about: { position: [-4.08, 2.7, 1.3], target: [-4.08, 0.55, -2.67], fov: 70 },
  contact: { position: [5.1, 2.5, 1.4], target: [5.1, 0.8, -3.12], fov: 65 },
}

function CameraDirector({ focus, reducedMotion, mobile }: Pick<Props, 'focus' | 'reducedMotion' | 'mobile'>) {
  const { camera } = useThree()
  const state = useRef({ tx: 0, ty: 2.15, tz: -0.8, ux: 0, uy: 1, uz: 0, fov: 46 })

  useEffect(() => {
    const mark = mobile ? mobileMarks[focus] ?? marks[focus] : marks[focus]
    const pos = mark.position
    const target = mark.target
    const up = mark.up ?? [0, 1, 0]
    const values = {
      x: pos[0], y: pos[1], z: pos[2],
      tx: target[0], ty: target[1], tz: target[2],
      ux: up[0], uy: up[1], uz: up[2],
      fov: mark.fov ?? 46,
    }
    if (reducedMotion) {
      camera.position.set(values.x, values.y, values.z)
      Object.assign(state.current, values)
      camera.up.set(values.ux, values.uy, values.uz)
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = values.fov
        camera.updateProjectionMatrix()
      }
      camera.lookAt(values.tx, values.ty, values.tz)
      return
    }
    const targetObject = { ...state.current, x: camera.position.x, y: camera.position.y, z: camera.position.z }
    const tween = gsap.to(targetObject, {
      ...values,
      duration: focus === 'room' ? 1.5 : 1.8,
      ease: 'power3.inOut',
      onUpdate: () => {
        camera.position.set(targetObject.x, targetObject.y, targetObject.z)
        Object.assign(state.current, targetObject)
      },
    })
    return () => { tween.kill() }
  }, [camera, focus, mobile, reducedMotion])

  useFrame(() => {
    const s = state.current
    camera.up.set(s.ux, s.uy, s.uz).normalize()
    camera.lookAt(s.tx, s.ty, s.tz)
    if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - s.fov) > 0.01) {
      camera.fov = s.fov
      camera.updateProjectionMatrix()
    }
  })
  return null
}

function HitBox({ position, size, onClick, enabled = true }: {
  position: [number, number, number]
  size: [number, number, number]
  onClick: () => void
  enabled?: boolean
}) {
  if (!enabled) return null
  return (
    <mesh position={position} onClick={(event) => { event.stopPropagation(); onClick() }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}>
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function Model({ onReady, focus }: { onReady: () => void, focus: Focus }) {
  const url = `${import.meta.env.BASE_URL}models/loft-room.glb`
  const { scene } = useGLTF(url)
  const model = useMemo(() => scene.clone(true), [scene])
  useEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = true
        child.castShadow = !child.name.includes('floor') && !child.name.includes('wall')
        child.visible = focus !== 'projects' || !/ceiling|beam|pendant/i.test(child.name)
      }
    })
    onReady()
  }, [focus, model, onReady])
  return <primitive object={model} />
}

function LoftContent({ focus, selectedProject, reducedMotion, mobile, onFocus, onProject, onReady }: Omit<Props, 'onError'>) {
  return <>
    <color attach="background" args={['#161b1a']} />
    <fog attach="fog" args={['#202523', 13, 29]} />
    <ambientLight intensity={1.35} color="#d8d9cc" />
    <hemisphereLight args={['#c5d5d3', '#5a493b', 2.2]} />
    <directionalLight position={[-3, 7, -1.5]} intensity={2.7} color="#cfe1e1" castShadow
      shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-camera-left={-9}
      shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} />
    <spotLight position={[2.2, 5.4, 1]} angle={0.8} penumbra={0.75} intensity={150}
      distance={12} color="#ffc58b" />
    <pointLight position={[-1.3, 3.0, -1.8]} intensity={35} distance={6} color="#ffc47b" />
    <pointLight position={[5, 3, -3]} intensity={22} distance={4} color="#efc59b" />
    <Model onReady={onReady} focus={focus} />
    <CameraDirector focus={focus} reducedMotion={reducedMotion} mobile={mobile} />
    <HitBox position={[-1.75, 1.55, -2.37]} size={[2, 1.4, 0.4]} onClick={() => onFocus('computer')} enabled={focus === 'room'} />
    <HitBox position={[2.3, 1.02, 1.05]} size={[5.6, 0.3, 2.8]} onClick={() => onFocus('projects')} enabled={focus === 'room'} />
    <HitBox position={[2.74, 2.63, -4.12]} size={[3.25, 2.3, 0.35]} onClick={() => onFocus('experience')} enabled={focus === 'room'} />
    <HitBox position={[-4.12, 1.6, -2.42]} size={[3.25, 2.7, 0.7]} onClick={() => onFocus('about')} enabled={focus === 'room'} />
    <HitBox position={[5.2, 1.55, -3]} size={[1.55, 3.1, 0.4]} onClick={() => onFocus('contact')} enabled={focus === 'room'} />
    {([[0.86, 0.72], [2.48, 0.93], [3.78, 1.41]] as const).map(([x, z], index) => (
      <group key={index}>
        <HitBox position={[x, 1.13, z]} size={[1.54, 0.15, 1.13]}
          enabled={focus === 'projects'} onClick={() => onProject(index)} />
        {focus === 'projects' && selectedProject === index &&
          <mesh position={[x, 1.055, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.6, 1.18]} />
            <meshBasicMaterial color="#dfab72" transparent opacity={0.25} depthWrite={false} />
          </mesh>}
      </group>
    ))}
  </>
}

class SceneBoundary extends React.Component<{ children: ReactNode, onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function LoftScene(props: Props) {
  return <SceneBoundary onError={props.onError}>
    <Canvas className="loft-canvas" shadows={!props.mobile} dpr={props.mobile ? [1, 1.15] : [1, 1.8]}
      camera={{ position: [0.2, 3.3, 8.6], fov: 46, near: 0.1, far: 65 }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}>
      <Suspense fallback={null}>
        <LoftContent {...props} />
      </Suspense>
    </Canvas>
  </SceneBoundary>
}

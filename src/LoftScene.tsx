import React, { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, RoundedBox, useGLTF } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import { BlueprintButton } from './WorldScreens'
import {
  ABOUT_SHELF_CAMERA,
  ABOUT_SHELF_HITBOX_POSITION,
  ABOUT_SHELF_HITBOX_SIZE,
  ABOUT_SHELF_MOBILE_CAMERA,
  ABOUT_SHELF_MOBILE_TARGET,
  ABOUT_SHELF_TARGET,
  applyChairShelfFixes,
} from './ChairShelfFixes'
import { applyDoorPosterFixes, contactDoorView } from './DoorPosterFixes'
import { applyLoftShellFixes } from './LoftShellFixes'
import LoftEnvironment from './LoftEnvironment'
import LoftCity from './LoftCity'
import type { Weather } from './visitWeather'

export type Focus = 'room' | 'computer' | 'projects' | 'experience' | 'about' | 'contact'
type Props = {
  focus: Focus
  selectedProject: number | null
  reducedMotion: boolean
  mobile: boolean
  weather: Weather
  onFocus: (focus: Focus) => void
  onProject: (index: number) => void
  computerContent: ReactNode
  projectContent: ReactNode
  onReady: () => void
  onError: () => void
}

type CameraMark = {
  position: [number, number, number]
  target: [number, number, number]
  up?: [number, number, number]
  fov?: number
}

const workbenchCenter: [number, number, number] = [2.28, 0.92, 1.04]

const normalizedObjectName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

function findNamedObject(root: THREE.Object3D, targetName: string): THREE.Object3D | undefined {
  const target = normalizedObjectName(targetName)
  let found: THREE.Object3D | undefined
  root.traverse((object) => {
    const name = normalizedObjectName(object.name)
    if (!found && (name === target || new RegExp(`^${target}\\d+$`).test(name))) found = object
  })
  return found
}

const marks: Record<Focus, CameraMark> = {
  room: { position: [0.2, 3.3, 8.6], target: [0, 2.15, -0.8], fov: 46 },
  computer: { position: [-1.64, 1.9, 0.18], target: [-1.72, 1.58, -2.42], fov: 41 },
  projects: { position: [workbenchCenter[0], 7.2, workbenchCenter[2]], target: workbenchCenter, up: [0, 0, -1], fov: 48 },
  experience: { position: [3.45, 2.8, 1.6], target: [3.45, 2.63, -4.2], fov: 42 },
  about: { position: ABOUT_SHELF_CAMERA, target: ABOUT_SHELF_TARGET, fov: 48 },
  contact: { position: contactDoorView.desktop.position, target: contactDoorView.desktop.target, fov: contactDoorView.desktop.fov },
}

const mobileMarks: Partial<Record<Focus, CameraMark>> = {
  room: { position: [0.8, 3.4, 11.3], target: [0.4, 2.1, -0.6], fov: 46 },
  projects: { position: [workbenchCenter[0], 8.2, workbenchCenter[2]], target: workbenchCenter, up: [0, 0, -1], fov: 82 },
  computer: { position: [-1.71, 1.78, 0.55], target: [-1.71, 1.63, -2.37], fov: 72 },
  experience: { position: [2.74, 3, 1.4], target: [2.74, 1.2, -4.2], fov: 75 },
  about: { position: ABOUT_SHELF_MOBILE_CAMERA, target: ABOUT_SHELF_MOBILE_TARGET, fov: 65 },
  contact: { position: contactDoorView.mobile.position, target: contactDoorView.mobile.target, fov: contactDoorView.mobile.fov },
}

function CameraDirector({ focus, reducedMotion, mobile }: Pick<Props, 'focus' | 'reducedMotion' | 'mobile'>) {
  const { camera, pointer } = useThree()
  const state = useRef({ x: 0.2, y: 3.3, z: 8.6, tx: 0, ty: 2.15, tz: -0.8, ux: 0, uy: 1, uz: 0, fov: 46 })
  const parallax = useRef({ x: 0, y: 0 })
  const initialized = useRef(false)

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
    if (reducedMotion || !initialized.current) {
      camera.position.set(values.x, values.y, values.z)
      Object.assign(state.current, values)
      camera.up.set(values.ux, values.uy, values.uz)
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = values.fov
        camera.updateProjectionMatrix()
      }
      camera.lookAt(values.tx, values.ty, values.tz)
      initialized.current = true
      return
    }
    const targetObject = { ...state.current }
    const tween = gsap.to(targetObject, {
      ...values,
      duration: focus === 'room' ? 1.5 : 1.8,
      ease: 'power3.inOut',
      onUpdate: () => { Object.assign(state.current, targetObject) },
    })
    return () => { tween.kill() }
  }, [camera, focus, mobile, reducedMotion])

  useFrame((_, delta) => {
    const s = state.current
    const roomParallax = focus === 'room' && !mobile && !reducedMotion
    const targetX = roomParallax ? pointer.x * 0.055 : 0
    const targetY = roomParallax ? -pointer.y * 0.035 : 0
    parallax.current.x = THREE.MathUtils.damp(parallax.current.x, targetX, 4.5, delta)
    parallax.current.y = THREE.MathUtils.damp(parallax.current.y, targetY, 4.5, delta)
    camera.position.set(s.x + parallax.current.x, s.y + parallax.current.y, s.z)
    camera.up.set(s.ux, s.uy, s.uz).normalize()
    camera.lookAt(s.tx + parallax.current.x * 0.45, s.ty + parallax.current.y * 0.45, s.tz)
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

function Model({ onReady, focus, selectedProject }: { onReady: () => void, focus: Focus, selectedProject: number | null }) {
  const { gl } = useThree()
  const url = `${import.meta.env.BASE_URL}models/loft-room.glb`
  const { scene } = useGLTF(url)
  const model = useMemo(() => {
    const clone = scene.clone(true)
    applyChairShelfFixes(clone)
    applyDoorPosterFixes(clone)
    applyLoftShellFixes(clone)
    return clone
  }, [scene])
  useEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = true
        child.castShadow = !child.name.includes('floor') && !child.name.includes('wall')
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
            for (const texture of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap,
              material.aoMap, material.emissiveMap, material.alphaMap, material.bumpMap]) {
              if (texture && texture.anisotropy < anisotropy) {
                texture.anisotropy = anisotropy
                texture.needsUpdate = true
              }
            }
            if (material.name === 'warm plaster') {
              material.normalScale.set(0.035, 0.035)
              material.roughness = Math.max(material.roughness, 0.94)
            }
            if (material.name === 'oiled oak') {
              material.normalScale.set(0.06, 0.06)
              material.roughness = Math.max(material.roughness, 0.88)
            }
          }
        }
      }
    })
    onReady()
  }, [gl, model, onReady])
  useEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = normalizedObjectName(child.name)
        const proceduralStair = /^(?:floatingstairtread|stairsiderail|ascendinghandrail|stairstringer)\d*$/.test(name)
        const blueprintAsset = /^project[123]blueprint(?:paper|artwork)\d*$/.test(name)
        const hideBlueprintAssets = blueprintAsset && focus === 'projects' && selectedProject !== null
        const replaceMonitorGraphic = focus === 'computer' && /^portfoliosummaryonscreen\d*$/.test(name)
        child.visible = !proceduralStair && !child.userData.doorPosterHidden && !child.userData.loftShellReplaced &&
          !hideBlueprintAssets && !replaceMonitorGraphic &&
          (focus !== 'projects' || !/(?:ceiling|beam|pendant)/.test(name))
      }
    })
  }, [focus, model, selectedProject])
  return <primitive object={model} />
}

const blueprintStarts: [number, number, number][] = [
  [0.86, 0.997, 0.72],
  [2.48, 0.997, 0.93],
  [3.78, 0.997, 1.41],
]

function FloatingBlueprint({ index, content, reducedMotion, mobile }: {
  index: number
  content: ReactNode
  reducedMotion: boolean
  mobile: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/loft-room.glb`)
  const start = blueprintStarts[index]
  const cardParts = useMemo(() => {
    const group = new THREE.Group()
    const paper = findNamedObject(scene, `project ${index + 1} blueprint paper`) as THREE.Mesh | undefined
    const artwork = findNamedObject(scene, `project ${index + 1} blueprint artwork`) as THREE.Mesh | undefined
    if (paper) {
      const paperClone = paper.clone()
      paperClone.position.sub(new THREE.Vector3(...start))
      group.add(paperClone)
    }
    if (artwork) {
      const artworkClone = artwork.clone()
      artworkClone.geometry = artwork.geometry.clone()
      artworkClone.geometry.translate(-start[0], -start[1], -start[2])
      group.add(artworkClone)
    }
    return group
  }, [index, scene, start])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    const destination: [number, number, number] = [workbenchCenter[0], mobile ? 2.72 : 3.25, workbenchCenter[2]]
    const scale = mobile ? 2.35 : 1.48
    if (reducedMotion) {
      group.position.set(...destination)
      group.rotation.set(0, 0, 0)
      group.scale.setScalar(scale)
      return
    }
    const motion = gsap.timeline({ defaults: { duration: 1.35, ease: 'power3.inOut' } })
    motion.to(group.position, { x: destination[0], y: destination[1], z: destination[2] }, 0)
    motion.to(group.scale, { x: scale, y: scale, z: scale }, 0)
    return () => { motion.kill() }
  }, [index, mobile, reducedMotion])

  useEffect(() => () => {
    cardParts.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const sourceArtwork = findNamedObject(scene, `project ${index + 1} blueprint artwork`) as THREE.Mesh | undefined
        if (object.geometry !== sourceArtwork?.geometry) object.geometry.dispose()
      }
    })
  }, [cardParts, index, scene])

  return <group ref={groupRef} position={start}>
    <primitive object={cardParts} dispose={null} />
    <Html center position={[0, 0.009, 0]} zIndexRange={[9, 8]} distanceFactor={mobile ? 5.1 : 3.8}>
      {content}
    </Html>
  </group>
}

function StairBeam({ start, end, radius, material }: {
  start: [number, number, number]
  end: [number, number, number]
  radius: number
  material: THREE.Material
}) {
  const { center, length, rotation } = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const delta = b.clone().sub(a)
    return {
      center: a.add(b).multiplyScalar(0.5),
      length: delta.length(),
      rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()),
    }
  }, [start, end])
  return <mesh position={center} quaternion={rotation} material={material} castShadow receiveShadow>
    <cylinderGeometry args={[radius, radius, length, 12]} />
  </mesh>
}

function Staircase() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/loft-room.glb`)
  const wood = useMemo(() => {
    const tread = findNamedObject(scene, 'floating stair tread') as THREE.Mesh | undefined
    const material = tread?.material
    return Array.isArray(material) ? material[0] : material ?? new THREE.MeshStandardMaterial({ color: '#60412f', roughness: 0.72 })
  }, [scene])
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#16191a', metalness: 0.72, roughness: 0.38 }), [])
  // Recompose the front flight in the browser so it reads as a diagonal loft stair from the hero camera.
  const steps = useMemo(() => Array.from({ length: 15 }, (_, index) => {
    const t = index / 14
    return { x: -4.2 + 2.8 * t, y: 0.19 + 3.01 * t, z: 1.95 - 4.2 * t }
  }), [])
  const railPosts = useMemo(() => steps.filter((_, index) => index <= 12 && index % 2 === 0).map((step) => ({
    start: [step.x + 0.66, step.y + 0.12, step.z] as [number, number, number],
    end: [step.x + 0.66, step.y + 0.72, step.z] as [number, number, number],
  })), [steps])
  const landingRail = useMemo(() => {
    const last = steps[steps.length - 1]
    const x = last.x + 0.66
    const y = last.y + 0.72
    return {
      handrailEnd: [x, y, -2.48] as [number, number, number],
      supportStart: [x, 3.26, -2.48] as [number, number, number],
      supportEnd: [x, 4.18, -2.48] as [number, number, number],
    }
  }, [steps])
  const handrail = useMemo(() => ({
    start: [steps[0].x + 0.66, steps[0].y + 0.72, steps[0].z] as [number, number, number],
    end: landingRail.handrailEnd,
  }), [landingRail, steps])
  const stringer = useMemo(() => ({
    start: [steps[0].x - 0.67, steps[0].y - 0.16, steps[0].z] as [number, number, number],
    end: [steps[steps.length - 1].x - 0.67, steps[steps.length - 1].y - 0.16, steps[steps.length - 1].z] as [number, number, number],
  }), [steps])

  return <group>
    {steps.map((step, index) => <RoundedBox key={index} position={[step.x, step.y, step.z]} args={[1.26, 0.12, 0.46]}
      radius={0.018} smoothness={3} material={wood} castShadow receiveShadow />)}
    <StairBeam {...stringer} radius={0.075} material={steel} />
    {railPosts.map((post, index) => <StairBeam key={`post-${index}`} {...post} radius={0.022} material={steel} />)}
    <StairBeam {...handrail} radius={0.038} material={steel} />
    <StairBeam start={landingRail.supportStart} end={landingRail.supportEnd} radius={0.027} material={steel} />
  </group>
}

function WebGLContextGuard({ onError }: { onError: () => void }) {
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const contextLost = (event: Event) => {
      event.preventDefault()
      onError()
    }
    canvas.addEventListener('webglcontextlost', contextLost)
    return () => canvas.removeEventListener('webglcontextlost', contextLost)
  }, [gl, onError])
  return null
}

function LoftContent({ focus, selectedProject, reducedMotion, mobile, weather, onFocus, onProject, onReady,
  computerContent, projectContent }: Omit<Props, 'onError'>) {
  return <LoftEnvironment weather={weather}>
    <spotLight position={[2.2, 5.4, 1]} angle={0.72} penumbra={0.88} intensity={74}
      distance={13} color="#ffc58b" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003}
      shadow-normalBias={0.025} />
    <pointLight position={[-1.3, 3.0, -1.8]} intensity={11} distance={6.5} color="#ffc47b" />
    <pointLight position={[5, 3, -3]} intensity={8} distance={4.5} color="#efc59b" />
    <pointLight position={[-4.1, 2.78, -0.1]} intensity={6.5} distance={5.5} color="#e6a86c" />
    <pointLight position={[-0.3, 3.63, -0.7]} intensity={5} distance={4.8} color="#e6a86c" />
    <pointLight position={[3.7, 5.32, -1.2]} intensity={4.2} distance={4.6} color="#e6a86c" />
    <LoftCity mobile={mobile} reducedMotion={reducedMotion} />
    <Model onReady={onReady} focus={focus} selectedProject={selectedProject} />
    <Staircase />
    <HitBox position={[-1.75, 1.55, -2.37]} size={[2, 1.4, 0.4]} onClick={() => onFocus('computer')} enabled={focus === 'room'} />
    <HitBox position={[2.3, 1.02, 1.05]} size={[5.6, 0.3, 2.8]} onClick={() => onFocus('projects')} enabled={focus === 'room'} />
    {focus === 'computer' && <Html center position={[-1.71, 1.63, -2.355]} zIndexRange={[9, 8]} distanceFactor={mobile ? 4.2 : 2}>
      {computerContent}
    </Html>}
    <HitBox position={[2.74, 2.63, -4.12]} size={[3.25, 2.3, 0.35]} onClick={() => onFocus('experience')} enabled={focus === 'room'} />
    <HitBox position={ABOUT_SHELF_HITBOX_POSITION} size={ABOUT_SHELF_HITBOX_SIZE} onClick={() => onFocus('about')} enabled={focus === 'room'} />
    <HitBox position={contactDoorView.hotspot.position} size={contactDoorView.hotspot.size} onClick={() => onFocus('contact')} enabled={focus === 'room'} />
    {blueprintStarts.map(([x, y, z], index) => (
      <group key={index}>
        <HitBox position={[x, y + 0.13, z]} size={[1.54, 0.15, 1.13]}
          enabled={focus === 'projects' && selectedProject === null} onClick={() => onProject(index)} />
        {focus === 'projects' && selectedProject === null && <Html center position={[x, y + 0.15, z]} zIndexRange={[9, 8]}>
          <BlueprintButton index={index} onSelect={() => onProject(index)} />
        </Html>}
      </group>
    ))}
    {focus === 'projects' && selectedProject !== null &&
      <FloatingBlueprint index={selectedProject} content={projectContent} reducedMotion={reducedMotion} mobile={mobile} />}
    <CameraDirector focus={focus} reducedMotion={reducedMotion} mobile={mobile} />
  </LoftEnvironment>
}

class SceneBoundary extends React.Component<{ children: ReactNode, onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function LoftScene(props: Props) {
  return <SceneBoundary onError={props.onError}>
    <Canvas className="loft-canvas" shadows={props.mobile ? false : { type: THREE.PCFShadowMap }} dpr={props.mobile ? [1, 1.15] : [1, 1.8]}
      camera={{ position: [0.2, 3.3, 8.6], fov: 46, near: 0.1, far: 65 }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => { gl.toneMappingExposure = 0.88; gl.domElement.setAttribute('aria-hidden', 'true') }}>
      <WebGLContextGuard onError={props.onError} />
      <Suspense fallback={null}>
        <LoftContent {...props} />
      </Suspense>
    </Canvas>
  </SceneBoundary>
}

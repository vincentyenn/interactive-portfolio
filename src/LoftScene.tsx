import React, { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, RoundedBox, useGLTF } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import { MonitorSurface, ProjectSheet } from './ObjectSurfaces'
import {
  ABOUT_SHELF_CAMERA,
  ABOUT_SHELF_HITBOX_POSITION,
  ABOUT_SHELF_HITBOX_SIZE,
  ABOUT_SHELF_MOBILE_CAMERA,
  ABOUT_SHELF_MOBILE_TARGET,
  ABOUT_SHELF_TARGET,
  applyChairShelfFixes,
} from './ChairShelfFixes'
import { applyDoorPosterFixes, contactConsoleView } from './DoorPosterFixes'
import { applyLoftShellFixes } from './LoftShellFixes'
import LoftEnvironment from './LoftEnvironment'
import LoftCity from './LoftCity'
import type { Weather } from './visitWeather'
import layout, { point, shellPoint, computerPoint, benchScale, benchPoint, experiencePoint, projectView } from './loftLayout'
import LivingSpaces from './LivingSpaces'
import WindowSunlight from './WindowSunlight'
import ProjectFocus from './ProjectFocus'
import PersonalArtifacts from './PersonalArtifacts'
import ContactConsole from './ContactConsole'
import { batchStaticMeshes } from './batchStaticMeshes'
import { RenderBudget, RenderStats } from './RenderBudget'
import { artifactView } from './roomArtifacts'

export type Focus = 'room' | 'computer' | 'projects' | 'experience' | 'about' | 'contact' | 'upstairs' | 'lounge' | 'nook'
type Props = {
  focus: Focus
  selectedProject: number | null
  selectedArtifact: string | null
  onArtifact: (id: string) => void
  reducedMotion: boolean
  mobile: boolean
  weather: Weather
  onFocus: (focus: Focus) => void
  onProject: (index: number) => void
  onBackToBlueprints: () => void
  onReady: () => void
  onError: () => void
}

type CameraMark = {
  position: [number, number, number]
  target: [number, number, number]
  up?: [number, number, number]
  fov?: number
}

const workbenchCenter: [number, number, number] = benchPoint([2.28, 0.92, 1.04])

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
  room: { position: point(layout.roomCamera), target: point(layout.roomTarget), fov: 52 },
  upstairs: { position: point(layout.upstairsCamera), target: point(layout.upstairsTarget), fov: 58 },
  nook: { position: [-5.45, 1.85, 2.15], target: [-6.2, .95, -.95], fov: 72 },
  lounge: { position: point(layout.loungeCamera), target: point(layout.loungeTarget), fov: 62 },
  computer: { position: computerPoint([-1.64, 1.9, 0.18]), target: computerPoint([-1.72, 1.58, -2.42]), fov: 41 },
  projects: { position: [workbenchCenter[0], projectView.cameraHeight, workbenchCenter[2]], target: workbenchCenter, up: [0, 0, -1], fov: projectView.fov },
  experience: { position: experiencePoint([3.03, 2.75, .3]), target: experiencePoint([3.03, 2.7, -4.43]), fov: 50 },
  about: { position: ABOUT_SHELF_CAMERA, target: ABOUT_SHELF_TARGET, fov: 48 },
  contact: { position: contactConsoleView.desktop.position, target: contactConsoleView.desktop.target, fov: contactConsoleView.desktop.fov },
}

const mobileMarks: Partial<Record<Focus, CameraMark>> = {
  room: { position: [0.3, 4.5, 13.1], target: point(layout.roomTarget), fov: 67 },
  upstairs: { position: [0.05, 5.1, -2.5], target: point(layout.upstairsTarget), fov: 78 },
  nook: { position: [-5.2, 2.15, 3.0], target: [-6.2, .95, -.95], fov: 86 },
  lounge: { position: [0.1, 3.1, 5.05], target: [0, 1.24, 11.4], fov: 78 },
  projects: { position: [workbenchCenter[0], projectView.cameraHeight, workbenchCenter[2]], target: workbenchCenter, up: [0, 0, -1], fov: projectView.mobileFov },
  computer: { position: computerPoint([-1.71, 1.78, 0.55]), target: computerPoint([-1.71, 1.63, -2.37]), fov: 72 },
  experience: { position: experiencePoint([3.03, 2.75, 1.1]), target: experiencePoint([3.03, 2.7, -4.43]), fov: 86 },
  about: { position: ABOUT_SHELF_MOBILE_CAMERA, target: ABOUT_SHELF_MOBILE_TARGET, fov: 65 },
  contact: { position: contactConsoleView.mobile.position, target: contactConsoleView.mobile.target, fov: contactConsoleView.mobile.fov },
}

function CameraDirector({ focus, selectedArtifact, reducedMotion, mobile }: Pick<Props, 'focus' | 'selectedArtifact' | 'reducedMotion' | 'mobile'>) {
  const { camera, pointer, size } = useThree()
  const state = useRef({ x: layout.roomCamera[0], y: layout.roomCamera[1], z: layout.roomCamera[2], tx: layout.roomTarget[0], ty: layout.roomTarget[1], tz: layout.roomTarget[2], ux: 0, uy: 1, uz: 0, fov: 46 })
  const parallax = useRef({ x: 0, y: 0 })
  const initialized = useRef(false)
  const previousFocus = useRef(focus)

  useEffect(() => {
    const mark: CameraMark = selectedArtifact ? artifactView(selectedArtifact, size.width / size.height) : mobile ? mobileMarks[focus] ?? marks[focus] : marks[focus]
    const pos = mark.position
    const target = mark.target
    const up = mark.up ?? [0, 1, 0]
    const values = {
      x: pos[0], y: pos[1], z: pos[2],
      tx: target[0], ty: target[1], tz: target[2],
      ux: up[0], uy: up[1], uz: up[2],
      fov: Math.min(focus === 'projects' ? 120 : 105, Math.max(mark.fov ?? 46,
        ['room', 'lounge'].includes(focus)
          ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(focus === 'room' ? 37 : 34)) / (size.width / size.height))) : 0)),
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
    const tween = gsap.timeline()
    if (focus === 'upstairs' || previousFocus.current === 'upstairs') {
      tween.to(targetObject, { x: -1.4, y: 4.95, z: -2.65, tx: -4.1, ty: 4.2, tz: -4.5, duration: 1.1, ease: 'power2.inOut', onUpdate: () => { Object.assign(state.current, targetObject) } })
    }
    previousFocus.current = focus
    tween.to(targetObject, {
      ...values,
      duration: focus === 'room' ? 1.5 : 1.8,
      ease: 'power3.inOut',
      onUpdate: () => { Object.assign(state.current, targetObject) },
    })
    return () => { tween.kill() }
  }, [camera, focus, selectedArtifact, mobile, reducedMotion, size.width, size.height])

  useFrame((_, delta) => {
    const s = state.current
    const roomParallax = ['room', 'upstairs', 'lounge', 'nook'].includes(focus) && !mobile && !reducedMotion
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

function Model({ onReady }: { onReady: () => void }) {
  const { gl } = useThree()
  const url = `${import.meta.env.BASE_URL}models/loft-room.glb`
  const { scene } = useGLTF(url)
  const { model, dispose } = useMemo(() => {
    const clone = scene.clone(true)
    applyChairShelfFixes(clone)
    applyDoorPosterFixes(clone)
    applyLoftShellFixes(clone)
    // Keep the stand behind the display; DOM text previously hid this overlap.
    clone.traverse((object) => {
      const name = normalizedObjectName(object.name)
      if (/^monitorstandneck\d*$/.test(name)) object.position.z = computerPoint([0, 0, -2.52])[2]
      if (/^monitorswivelhinge\d*$/.test(name)) object.position.z = computerPoint([0, 0, -2.526])[2]
    })
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = normalizedObjectName(child.name)
        const proceduralStair = /^(?:floatingstairtread|stairsiderail|ascendinghandrail|stairstringer)\d*$/.test(name)
        const blueprintAsset = /^project[123]blueprint(?:paper|artwork)\d*$/.test(name)
        const hideBlueprintAssets = blueprintAsset
        let collectionOwner: THREE.Object3D | null = child
        const collectionPattern = /^(?:experiencedisplayframe|experiencetimelineartwork|personalshelf|shelfsteel|shelfbook|shelfceramic|shelfphoto|pinboardaboveshelf|pinnedcard|americanfootball|vintagevideocamera|headphone)/
        while (collectionOwner && !collectionPattern.test(normalizedObjectName(collectionOwner.name))) collectionOwner = collectionOwner.parent
        const replaceCollection = collectionOwner !== null
        const replaceMonitorGraphic = /^portfoliosummaryonscreen\d*$/.test(name)
        child.visible = !proceduralStair && !child.userData.doorPosterHidden && !child.userData.loftShellReplaced &&
          !hideBlueprintAssets && !replaceMonitorGraphic && !replaceCollection
      }
    })
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = true
        child.castShadow = !/(?:glass|pane)/i.test(child.name)
      }
    })
    const dispose = batchStaticMeshes(clone)
    return { model: clone, dispose }
  }, [scene])
  useEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = true
        child.castShadow = !/(?:glass|pane)/i.test(child.name)
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
            if (material.name === 'studio woven floor textile') {
              material.color.set('#737d79')
              material.roughness = 1
              material.normalScale.set(.22, .22)
            }
            if (material.name === 'lounge woven wool rug') {
              material.roughness = 1
              material.normalScale.set(.18, .18)
            }
            if (material.name === 'lounge aged leather') material.roughness = .71
            if (/mid_century_lounge_chair/.test(material.name)) material.roughness = Math.max(material.roughness, .72)
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
    gl.shadowMap.needsUpdate = true
    onReady()
  }, [gl, model, onReady])
  useEffect(() => dispose, [dispose])
  return <primitive object={model} dispose={null} />
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

function Staircase({ onEnter, interactive }: { onEnter: () => void, interactive: boolean }) {
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

  return <group scale={point(layout.shellScale)}>
    {steps.map((step, index) => <RoundedBox key={index} position={[step.x, step.y, step.z]} args={[1.26, 0.12, 0.46]}
      radius={0.018} smoothness={3} material={wood} castShadow receiveShadow
      onClick={interactive ? (event) => { event.stopPropagation(); onEnter() } : undefined}
      onPointerOver={interactive ? () => { document.body.style.cursor = 'pointer' } : undefined}
      onPointerOut={() => { document.body.style.cursor = '' }} />)}
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

function LoftContent({ focus, selectedProject, selectedArtifact, onArtifact, reducedMotion, mobile, weather, onFocus, onProject, onReady,
  onBackToBlueprints }: Omit<Props, 'onError'>) {
  const taskTarget = useMemo(() => { const target = new THREE.Object3D(); target.position.set(...benchPoint([2.28, .92, 1.04])); return target }, [])
  return <LoftEnvironment weather={weather} reducedMotion={reducedMotion}>
    <Suspense fallback={null}><Environment files={`${import.meta.env.BASE_URL}environments/studio_small_03_1k.hdr`} environmentIntensity={.1} background={false} /></Suspense>
    <primitive object={taskTarget} />
    <spotLight target={taskTarget} position={benchPoint([2.28, 5.06, 1.04])} angle={0.72} penumbra={1} intensity={60}
      distance={8} color="#ffe0b9" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003}
      shadow-normalBias={0.025} />
    <pointLight position={computerPoint([-1.3, 3.0, -1.8])} intensity={11} distance={6.5} color="#ffc47b" />
    <pointLight position={shellPoint([5, 3, -3])} intensity={8} distance={4.5} color="#efc59b" />
    <pointLight position={shellPoint([-4.1, 2.78, -0.1])} intensity={6.5} distance={5.5} color="#e6a86c" />
    <pointLight position={shellPoint([-0.3, 3.63, -0.7])} intensity={5} distance={4.8} color="#e6a86c" />
    <pointLight position={shellPoint([3.7, 5.32, -1.2])} intensity={4.2} distance={4.6} color="#e6a86c" />
    <LoftCity mobile={mobile} reducedMotion={reducedMotion} />
    <WindowSunlight mobile={mobile} reducedMotion={reducedMotion} />
    <Model onReady={onReady} />
    <Staircase onEnter={() => onFocus('upstairs')} interactive={focus === 'room'} />
    <PersonalArtifacts focus={focus} selectedArtifact={selectedArtifact} onArtifact={onArtifact} onFocus={onFocus} />
    <ContactConsole active={focus === 'contact'} reducedMotion={reducedMotion} onFocus={onFocus} />
    <LivingSpaces focus={focus} onFocus={onFocus} reducedMotion={reducedMotion} mobile={mobile} />
    <HitBox position={computerPoint([-1.75, 1.55, -2.37])} size={[2, 1.4, 0.4]} onClick={() => onFocus('computer')} enabled={focus === 'room'} />
    <HitBox position={benchPoint([2.3, 1.02, 1.05])} size={[5.6 * benchScale, 0.3, 2.8 * benchScale]} onClick={() => onFocus('projects')} enabled={focus === 'room'} />
    <MonitorSurface active={focus === 'computer'} reducedMotion={reducedMotion} onFocus={onFocus} />
    <HitBox position={experiencePoint([2.74, 2.63, -4.12])} size={[3.25, 2.3, 0.35]} onClick={() => onFocus('experience')} enabled={focus === 'room'} />
    <HitBox position={ABOUT_SHELF_HITBOX_POSITION} size={ABOUT_SHELF_HITBOX_SIZE} onClick={() => onFocus('about')} enabled={focus === 'room'} />
    <HitBox position={contactConsoleView.hotspot.position} size={contactConsoleView.hotspot.size} onClick={() => onFocus('contact')} enabled={focus === 'room'} />
    {[0, 1, 2].map((index) => <ProjectSheet key={index} index={index}
      selected={focus === 'projects' && selectedProject === index}
      enabled={focus === 'projects' && selectedProject === null}
      mobile={mobile} reducedMotion={reducedMotion} onSelect={() => onProject(index)} onBack={onBackToBlueprints} />)}
    <ProjectFocus active={focus === 'projects' && selectedProject !== null} mobile={mobile} />
    <CameraDirector focus={focus} selectedArtifact={selectedArtifact} reducedMotion={reducedMotion} mobile={mobile} />
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
    <Canvas className="loft-canvas" shadows={props.mobile ? false : { type: THREE.PCFShadowMap }} dpr={props.mobile ? [1, 1.15] : [1, 1.5]}
      camera={{ position: point(layout.roomCamera), fov: 52, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => { gl.toneMappingExposure = 0.88; gl.domElement.setAttribute('aria-hidden', 'true') }}>
      <RenderBudget mobile={props.mobile} focus={props.focus} selectedProject={props.selectedProject} selectedArtifact={props.selectedArtifact} />
      {import.meta.env.DEV && <RenderStats />}
      <WebGLContextGuard onError={props.onError} />
      <Suspense fallback={null}>
        <LoftContent {...props} />
      </Suspense>
    </Canvas>
  </SceneBoundary>
}

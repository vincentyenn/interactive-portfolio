import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Weather } from './visitWeather'

export type DayPhase = 'day' | 'sunset' | 'night'

export type LoftEnvironmentState = {
  weather: Weather
  phase: DayPhase
  daylight: number
  windowGlow: number
  cycleSeconds: number
}

const EnvironmentContext = createContext<LoftEnvironmentState | null>(null)

export function useLoftEnvironment() {
  const environment = useContext(EnvironmentContext)
  if (!environment) throw new Error('useLoftEnvironment must be used inside LoftEnvironment')
  return environment
}

type LightingKeyframe = {
  at: number
  sky: THREE.Color
  fog: THREE.Color
  ambient: THREE.Color
  hemisphereSky: THREE.Color
  hemisphereGround: THREE.Color
  sun: THREE.Color
  daylight: number
  fogNear: number
  fogFar: number
  exposure: number
}

function keyframe(at: number, sky: string, fog: string, ambient: string, hemisphereSky: string,
  hemisphereGround: string, sun: string, daylight: number, fogNear: number, fogFar: number, exposure: number): LightingKeyframe {
  return {
    at,
    sky: new THREE.Color(sky),
    fog: new THREE.Color(fog),
    ambient: new THREE.Color(ambient),
    hemisphereSky: new THREE.Color(hemisphereSky),
    hemisphereGround: new THREE.Color(hemisphereGround),
    sun: new THREE.Color(sun),
    daylight,
    fogNear,
    fogFar,
    exposure,
  }
}

const lightingCycle = [
  keyframe(0, '#8ba9b2', '#83979d', '#bec9c2', '#a9c5d0', '#4a4439', '#f4dfc3', 1, 15, 58, 0.98),
  keyframe(0.28, '#8ba9b2', '#83979d', '#bec9c2', '#a9c5d0', '#4a4439', '#f4dfc3', 1, 15, 58, 0.98),
  keyframe(0.42, '#c17e60', '#9e6d5d', '#d2a083', '#e3ad83', '#3a302d', '#ffad76', 0.58, 12, 49, 0.9),
  keyframe(0.56, '#182532', '#1a252d', '#61717a', '#586c7a', '#171c20', '#7187a1', 0.16, 10, 38, 0.82),
  keyframe(0.81, '#111e2b', '#17232d', '#596c79', '#536a7e', '#151b20', '#687c94', 0.12, 10, 38, 0.82),
  keyframe(0.93, '#536779', '#465864', '#8b9190', '#889baa', '#2a2929', '#d7a787', 0.38, 12, 47, 0.84),
  keyframe(1, '#8ba9b2', '#83979d', '#bec9c2', '#a9c5d0', '#4a4439', '#f4dfc3', 1, 15, 58, 0.98),
]

const scratchSky = new THREE.Color()
const scratchFog = new THREE.Color()
const scratchAmbient = new THREE.Color()
const scratchHemisphereSky = new THREE.Color()
const scratchHemisphereGround = new THREE.Color()
const scratchSun = new THREE.Color()

function sampleCycle(seconds: number) {
  const progress = (seconds % 360) / 360
  let from = lightingCycle[0]
  let to = lightingCycle[1]
  for (let index = 0; index < lightingCycle.length - 1; index += 1) {
    if (progress >= lightingCycle[index].at && progress <= lightingCycle[index + 1].at) {
      from = lightingCycle[index]
      to = lightingCycle[index + 1]
      break
    }
  }
  const span = to.at - from.at || 1
  const raw = THREE.MathUtils.clamp((progress - from.at) / span, 0, 1)
  const amount = raw * raw * (3 - 2 * raw)
  const blend = (a: number, b: number) => THREE.MathUtils.lerp(a, b, amount)
  return {
    progress,
    sky: scratchSky.copy(from.sky).lerp(to.sky, amount),
    fog: scratchFog.copy(from.fog).lerp(to.fog, amount),
    ambient: scratchAmbient.copy(from.ambient).lerp(to.ambient, amount),
    hemisphereSky: scratchHemisphereSky.copy(from.hemisphereSky).lerp(to.hemisphereSky, amount),
    hemisphereGround: scratchHemisphereGround.copy(from.hemisphereGround).lerp(to.hemisphereGround, amount),
    sun: scratchSun.copy(from.sun).lerp(to.sun, amount),
    daylight: blend(from.daylight, to.daylight),
    fogNear: blend(from.fogNear, to.fogNear),
    fogFar: blend(from.fogFar, to.fogFar),
    exposure: blend(from.exposure, to.exposure),
  }
}

function DynamicLighting({ state }: { state: LoftEnvironmentState }) {
  const { scene, gl } = useThree()
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemisphereRef = useRef<THREE.HemisphereLight>(null)
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const practicalLights = useRef<Array<THREE.PointLight | null>>([])
  const skyRef = useRef(new THREE.Color('#8ba9b2'))
  const fogRef = useRef(new THREE.Fog('#83979d', 15, 58))
  const practicalPositions: [number, number, number][] = [
    [-4.6, 5.2, -2.55], [-1.55, 5.2, -2.55], [1.55, 5.2, -2.55], [4.6, 5.2, -2.55],
    [-4.6, 5.2, 1.8], [-1.55, 5.2, 1.8], [1.55, 5.2, 1.8], [4.6, 5.2, 1.8],
  ]

  useFrame(({ clock }) => {
    const sampled = sampleCycle(clock.elapsedTime)
    state.cycleSeconds = clock.elapsedTime % 360
    state.daylight = sampled.daylight
    state.windowGlow = THREE.MathUtils.lerp(0.08, 1.45, 1 - sampled.daylight)
    state.phase = sampled.progress < 0.32 || sampled.progress >= 0.93
      ? 'day'
      : sampled.progress < 0.48 ? 'sunset' : 'night'

    skyRef.current.copy(sampled.sky)
    fogRef.current.color.copy(sampled.fog)
    fogRef.current.near = sampled.fogNear
    fogRef.current.far = sampled.fogFar
    scene.background = skyRef.current
    scene.fog = fogRef.current

    if (ambientRef.current) {
      ambientRef.current.color.copy(sampled.ambient)
      ambientRef.current.intensity = 0.22 + sampled.daylight * 0.33
    }
    if (hemisphereRef.current) {
      hemisphereRef.current.color.copy(sampled.hemisphereSky)
      hemisphereRef.current.groundColor.copy(sampled.hemisphereGround)
      hemisphereRef.current.intensity = 0.38 + sampled.daylight * 0.4
    }
    if (sunRef.current) {
      sunRef.current.color.copy(sampled.sun)
      sunRef.current.intensity = 0.08 + sampled.daylight * 0.96
      const solarArc = sampled.progress * Math.PI * 2
      sunRef.current.position.set(-3 + Math.cos(solarArc) * 1.5, 4.5 + Math.sin(solarArc) * 2.2, -1.5)
    }
    const nightLevel = 1 - THREE.MathUtils.smoothstep(sampled.daylight, 0.22, 0.78)
    for (const light of practicalLights.current) {
      if (light) light.intensity = nightLevel * 12
    }
    gl.toneMappingExposure = sampled.exposure
  })

  return <>
    <ambientLight ref={ambientRef} intensity={0.46} color="#bec9c2" />
    <hemisphereLight ref={hemisphereRef} args={['#a9c5d0', '#4a4439', 0.71]} />
    <directionalLight ref={sunRef} position={[-3, 7, -1.5]} intensity={1.04} color="#f4dfc3" />
    {practicalPositions.map((position, index) => <pointLight key={index}
      ref={(light) => { practicalLights.current[index] = light }}
      position={position} intensity={0} distance={9.5} decay={1.6}
      color={index % 2 === 0 ? '#ffd2a2' : '#ffe0bd'} castShadow={false} />)}
  </>
}

export default function LoftEnvironment({ weather, children }: { weather: Weather, children: ReactNode }) {
  const state = useMemo<LoftEnvironmentState>(() => ({
    weather,
    phase: 'day',
    daylight: 1,
    windowGlow: 0.08,
    cycleSeconds: 0,
  }), [weather])

  return <EnvironmentContext.Provider value={state}>
    <DynamicLighting state={state} />
    {children}
  </EnvironmentContext.Provider>
}

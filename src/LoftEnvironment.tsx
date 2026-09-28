import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { shellPoint } from './loftLayout'
import type { Weather } from './visitWeather'

export type DayPhase = 'day' | 'sunset' | 'night'

export type LoftEnvironmentState = {
  weather: Weather
  phase: DayPhase
  daylight: number
  windowGlow: number
  cycleSeconds: number
  directSun: number
  sunColor: THREE.Color
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

function DynamicLighting({ state, reducedMotion }: { state: LoftEnvironmentState, reducedMotion: boolean }) {
  const { scene, gl } = useThree()
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemisphereRef = useRef<THREE.HemisphereLight>(null)
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const windowBounce = useRef<THREE.PointLight>(null)
  const practicalLights = useRef<Array<THREE.PointLight | null>>([])
  const weatherTint = useMemo(() => new THREE.Color(state.weather === 'thunderstorm' ? '#52616f' : '#9caeb9'), [state.weather])
  const cloudCover = { clear: 0, cloudy: .68, rain: .86, thunderstorm: .97, snow: .8 }[state.weather]
  const sunTarget = useMemo(() => new THREE.Object3D(), [])
  const skyRef = useRef(new THREE.Color('#8ba9b2'))
  const fogRef = useRef(new THREE.Fog('#83979d', 15, 58))
  const practicalPositions: [number, number, number][] = [
    [-4.6, 5.2, -2.55], [-1.55, 5.2, -2.55], [1.55, 5.2, -2.55], [4.6, 5.2, -2.55],
    [-4.6, 5.2, 1.8], [-1.55, 5.2, 1.8], [1.55, 5.2, 1.8], [4.6, 5.2, 1.8],
    [-4, 5.2, 7.6], [0, 5.2, 7.6], [4, 5.2, 7.6],
    [-4, 5.2, 10.3], [0, 5.2, 10.3], [4, 5.2, 10.3],
  ]

  useFrame(({ clock }) => {
    const seconds = reducedMotion ? 36 : clock.elapsedTime
    const sampled = sampleCycle(seconds)
    state.cycleSeconds = seconds % 360
    state.directSun = THREE.MathUtils.smoothstep(sampled.daylight, .2, .85) * (1 - cloudCover) ** 2
    state.sunColor.copy(sampled.sun)
    state.daylight = sampled.daylight
    state.windowGlow = THREE.MathUtils.lerp(0.08, 1.45, 1 - sampled.daylight)
    state.phase = sampled.progress < 0.32 || sampled.progress >= 0.93
      ? 'day'
      : sampled.progress < 0.48 ? 'sunset' : 'night'

    skyRef.current.copy(sampled.sky).lerp(weatherTint, cloudCover * sampled.daylight * .65)
    fogRef.current.color.copy(sampled.fog).lerp(weatherTint, cloudCover * sampled.daylight * .52)
    fogRef.current.near = sampled.fogNear + 5
    fogRef.current.far = sampled.fogFar * (1 - cloudCover * .25)
    scene.background = skyRef.current
    scene.fog = fogRef.current

    if (ambientRef.current) {
      ambientRef.current.color.copy(sampled.ambient)
      ambientRef.current.intensity = 0.22 + sampled.daylight * (.33 - cloudCover * .1)
    }
    if (hemisphereRef.current) {
      hemisphereRef.current.color.copy(sampled.hemisphereSky)
      hemisphereRef.current.groundColor.copy(sampled.hemisphereGround)
      hemisphereRef.current.intensity = 0.38 + sampled.daylight * (.4 - cloudCover * .1)
    }
    if (sunRef.current) {
      sunRef.current.color.copy(sampled.sun)
      sunRef.current.intensity = .08 + state.directSun * 2.15
      // Match the window shafts; keeping direction stable avoids crawling shadow texels.
      sunRef.current.position.set(-8.8, 12.4, -20)
    }
    if (windowBounce.current) windowBounce.current.intensity = sampled.daylight * (state.weather === 'clear' ? 9 : 5)
    const nightLevel = 1 - THREE.MathUtils.smoothstep(sampled.daylight, 0.22, 0.78)
    for (const light of practicalLights.current) {
      if (light) {
        light.intensity = nightLevel * 12
        // Zero-intensity lights still enlarge Three's per-pixel light loop.
        light.visible = nightLevel > 0
      }
    }
    gl.toneMappingExposure = sampled.exposure
  })

  return <>
    <ambientLight ref={ambientRef} intensity={0.46} color="#bec9c2" />
    <hemisphereLight ref={hemisphereRef} args={['#a9c5d0', '#4a4439', 0.71]} />
    <pointLight ref={windowBounce} position={[-1.6, 4.5, -5.2]} color="#d5e5ef" intensity={0} distance={11} decay={2} />
    <primitive object={sunTarget} />
    <directionalLight ref={sunRef} target={sunTarget} position={[-8.8, 12.4, -20]} intensity={1.04} color="#f4dfc3"
      castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-13} shadow-camera-right={13}
      shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-near={1} shadow-camera-far={55}
      shadow-bias={-.00012} shadow-normalBias={.035} />
    {practicalPositions.map((position, index) => <pointLight key={index}
      ref={(light) => { practicalLights.current[index] = light }}
      position={shellPoint(position)} intensity={0} distance={12} decay={1.6}
      color={index % 2 === 0 ? '#ffd2a2' : '#ffe0bd'} castShadow={false} />)}
  </>
}

export default function LoftEnvironment({ weather, reducedMotion, children }: { weather: Weather, reducedMotion: boolean, children: ReactNode }) {
  const state = useMemo<LoftEnvironmentState>(() => ({
    weather,
    phase: 'day',
    daylight: 1,
    windowGlow: 0.08,
    cycleSeconds: 0,
    directSun: 0,
    sunColor: new THREE.Color('#ffe2ad'),
  }), [weather])

  return <EnvironmentContext.Provider value={state}>
    <DynamicLighting state={state} reducedMotion={reducedMotion} />
    {children}
  </EnvironmentContext.Provider>
}

import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useLoftEnvironment } from './LoftEnvironment'
import type { Weather } from './visitWeather'

type TowerStyle = 'slim' | 'taipei' | 'setback' | 'stacked' | 'rounded'
type Tower = {
  x: number
  z: number
  width: number
  depth: number
  height: number
  style: TowerStyle
  tone: string
  seed: number
  antenna?: boolean
}

const skyline: Tower[] = [
  { x: -17.5, z: -33, width: 3.2, depth: 3.3, height: 11.5, style: 'stacked', tone: '#34434a', seed: 2 },
  { x: -14, z: -24, width: 2.6, depth: 2.9, height: 15.8, style: 'slim', tone: '#354750', seed: 3, antenna: true },
  { x: -10.4, z: -35, width: 3.3, depth: 3.2, height: 16.2, style: 'setback', tone: '#3c4a4e', seed: 5 },
  { x: -7.5, z: -20, width: 3.5, depth: 3.8, height: 13.4, style: 'rounded', tone: '#33464d', seed: 8 },
  { x: -4.8, z: -37, width: 2.9, depth: 3.1, height: 18.6, style: 'slim', tone: '#3b4a53', seed: 11, antenna: true },
  { x: -1.1, z: -27, width: 4.2, depth: 3.8, height: 13.8, style: 'stacked', tone: '#36474c', seed: 13 },
  { x: 3.4, z: -39, width: 4.1, depth: 4.1, height: 22.2, style: 'taipei', tone: '#3b4d52', seed: 17, antenna: true },
  { x: 7.2, z: -23, width: 2.8, depth: 3.4, height: 15.3, style: 'slim', tone: '#35484f', seed: 19 },
  { x: 10.4, z: -34, width: 3.6, depth: 3.4, height: 17.4, style: 'setback', tone: '#3e4b4d', seed: 23 },
  { x: 14, z: -25, width: 3.2, depth: 3.2, height: 12.4, style: 'rounded', tone: '#33454c', seed: 29 },
  { x: 17.8, z: -39, width: 4, depth: 3.5, height: 18.8, style: 'slim', tone: '#3a4a51', seed: 31, antenna: true },
  { x: -22, z: -45, width: 4.5, depth: 4.4, height: 14.5, style: 'setback', tone: '#34444b', seed: 37 },
  { x: 22, z: -46, width: 4.2, depth: 4.4, height: 16.8, style: 'stacked', tone: '#394a50', seed: 41 },
]

type Section = { width: number, depth: number, height: number, bottom: number, index: number }

function sectionsFor(tower: Tower): Section[] {
  const { width, depth, height, style } = tower
  const sections: Section[] = []
  const add = (w: number, d: number, h: number, bottom: number, index: number) => sections.push({ width: w, depth: d, height: h, bottom, index })
  if (style === 'taipei') {
    const levels = 8
    for (let level = 0; level < levels; level += 1) {
      const taper = 1 - level * 0.052
      add(width * taper, depth * taper, height / levels, (height / levels) * level, level)
    }
  } else if (style === 'setback') {
    add(width, depth, height * 0.55, 0, 0)
    add(width * 0.82, depth * 0.84, height * 0.28, height * 0.55, 1)
    add(width * 0.62, depth * 0.64, height * 0.17, height * 0.83, 2)
  } else if (style === 'stacked') {
    add(width, depth, height * 0.38, 0, 0)
    add(width * 0.86, depth * 0.9, height * 0.33, height * 0.38, 1)
    add(width * 0.69, depth * 0.75, height * 0.29, height * 0.71, 2)
  } else {
    add(width, depth, height, 0, 0)
    if (style === 'rounded') add(width * 0.56, depth * 0.55, height * 0.12, height, 1)
  }
  return sections
}

function seeded(seed: number, index: number) {
  const value = Math.sin(seed * 127.1 + index * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function Skyline() {
  const environment = useLoftEnvironment()
  const buildingsRef = useRef<THREE.InstancedMesh>(null)
  const litRef = useRef<THREE.InstancedMesh>(null)
  const darkRef = useRef<THREE.InstancedMesh>(null)
  const { buildings, lit, dark } = useMemo(() => {
    const buildings: { matrix: THREE.Matrix4, color: THREE.Color }[] = []
    const lit: THREE.Matrix4[] = []
    const dark: THREE.Matrix4[] = []
    const dummy = new THREE.Object3D()
    for (const tower of skyline) {
      for (const section of sectionsFor(tower)) {
        dummy.position.set(tower.x, -1.15 + section.bottom + section.height / 2, tower.z)
        dummy.scale.set(section.width, section.height, section.depth)
        dummy.updateMatrix()
        buildings.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(tower.tone) })
        const width = section.width * .86
        const height = section.height * .84
        const columns = Math.max(2, Math.min(8, Math.floor(width / .42)))
        const floors = Math.max(2, Math.floor(section.height / .72))
        for (let row = 0; row < floors; row++) for (let column = 0; column < columns; column++) {
          if (seeded(tower.seed + section.index * 13, row * 17 + column) < .16) continue
          const x = tower.x - width / 2 + ((column + 1) / (columns + 1)) * width
          const y = -1.15 + section.bottom + section.height / 2 - height / 2 + ((row + .72) / floors) * height
          dummy.position.set(x, y, tower.z + section.depth / 2 + .028)
          dummy.scale.set(Math.min(.24, width / (columns + 1) * .52), Math.min(.3, height / floors * .52), 1)
          dummy.updateMatrix()
          const destination = seeded(tower.seed + section.index * 13 + 9, row * 23 + column) > .66 ? lit : dark
          destination.push(dummy.matrix.clone())
        }
      }
    }
    return { buildings, lit, dark }
  }, [])
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const windowGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const buildingMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .62, metalness: .36 }), [])
  const litMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b78e5e', emissive: '#f2b36d', emissiveIntensity: .35, roughness: .28, metalness: .16 }), [])
  const darkMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#17252b', emissive: '#253138', emissiveIntensity: .16, roughness: .32, metalness: .22 }), [])
  useLayoutEffect(() => {
    buildings.forEach(({ matrix, color }, index) => {
      buildingsRef.current?.setMatrixAt(index, matrix)
      buildingsRef.current?.setColorAt(index, color)
    })
    lit.forEach((matrix, index) => litRef.current?.setMatrixAt(index, matrix))
    dark.forEach((matrix, index) => darkRef.current?.setMatrixAt(index, matrix))
    for (const mesh of [buildingsRef.current, litRef.current, darkRef.current]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [buildings, lit, dark])
  useFrame(() => { litMaterial.emissiveIntensity = .06 + environment.windowGlow })
  useEffect(() => () => {
    geometry.dispose()
    windowGeometry.dispose()
    buildingMaterial.dispose()
    litMaterial.dispose()
    darkMaterial.dispose()
  }, [geometry, windowGeometry, buildingMaterial, litMaterial, darkMaterial])
  return <group>
    <instancedMesh ref={buildingsRef} args={[geometry, buildingMaterial, buildings.length]} castShadow={false} receiveShadow={false} />
    <instancedMesh ref={darkRef} args={[windowGeometry, darkMaterial, dark.length]} castShadow={false} receiveShadow={false} />
    <instancedMesh ref={litRef} args={[windowGeometry, litMaterial, lit.length]} castShadow={false} receiveShadow={false} />
    {skyline.filter((tower) => tower.antenna).map((tower) => <group key={tower.seed} position={[tower.x, -1.15 + tower.height, tower.z]}>
      <mesh position={[0, .85, 0]}><cylinderGeometry args={[.024, .055, 1.7, 8]} /><meshStandardMaterial color="#66767a" metalness={.8} roughness={.3} /></mesh>
      <mesh position={[0, 1.72, 0]}><sphereGeometry args={[.075, 8, 6]} /><meshStandardMaterial color="#f4b87d" emissive="#e59760" emissiveIntensity={.38} /></mesh>
    </group>)}
  </group>
}

function StreetLamp({ x, z }: { x: number, z: number }) {
  return <group position={[x, -1.15, z]}>
    <mesh position={[0, 1.55, 0]}>
      <cylinderGeometry args={[.035, .055, 3.1, 8]} />
      <meshStandardMaterial color="#34474b" metalness={.58} roughness={.48} />
    </mesh>
    <mesh position={[0, 3.04, 0]}>
      <boxGeometry args={[.7, .07, .09]} />
      <meshStandardMaterial color="#34474b" metalness={.58} roughness={.48} />
    </mesh>
    <mesh position={[.3, 2.99, 0]}>
      <boxGeometry args={[.19, .035, .1]} />
      <meshBasicMaterial color="#f4c58b" toneMapped={false} />
    </mesh>
  </group>
}

function RoadMarkings({ z, snow }: { z: number, snow: boolean }) {
  const markings = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!markings.current) return
    const dummy = new THREE.Object3D()
    for (let index = 0; index < 15; index += 1) {
      dummy.position.set(-42 + index * 6, -1.139, z)
      dummy.scale.set(2.1, .006, .075)
      dummy.updateMatrix()
      markings.current.setMatrixAt(index, dummy.matrix)
    }
    for (let index = 0; index < 7; index += 1) {
      dummy.position.set((index - 3) * .35, -1.138, z)
      dummy.scale.set(.16, .006, 4.9)
      dummy.updateMatrix()
      markings.current.setMatrixAt(15 + index, dummy.matrix)
    }
    markings.current.instanceMatrix.needsUpdate = true
    markings.current.computeBoundingSphere()
  }, [z])
  return <instancedMesh ref={markings} args={[undefined, undefined, 22]} castShadow={false} receiveShadow={false}>
    <boxGeometry args={[1, 1, 1]} />
    <meshBasicMaterial color={snow ? '#cbd1cb' : '#a8a89b'} />
  </instancedMesh>
}

function CityGround() {
  const { weather } = useLoftEnvironment()
  const snow = weather === 'snow'
  const wet = weather === 'rain' || weather === 'thunderstorm'
  return <group name="city streets and ground">
    <mesh position={[0, -1.17, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
      <planeGeometry args={[180, 180]} />
      <meshStandardMaterial color={snow ? '#879397' : '#253238'} roughness={wet ? .48 : .96} metalness={wet ? .14 : .02} />
    </mesh>
    {[26, -12].map((z) => <group key={z}>
      <mesh position={[0, -1.155, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[90, 5.6]} />
        <meshStandardMaterial color={snow ? '#48585c' : '#141f24'} roughness={wet ? .34 : .94} metalness={wet ? .2 : .03} />
      </mesh>
      {[-3.35, 3.35].map((side) => <mesh key={side} position={[0, -1.115, z + side]}>
        <boxGeometry args={[90, .08, 1.05]} />
        <meshStandardMaterial color={snow ? '#b2b8b6' : '#5a6868'} roughness={.98} />
      </mesh>)}
      <RoadMarkings z={z} snow={snow} />
    </group>)}
    <StreetLamp x={-11.8} z={29.4} />
    <StreetLamp x={11.8} z={29.4} />
  </group>
}

// A single row of shallow shopfronts gives the lounge a street-level horizon.
// Repeated parts share geometry and materials; signs use one small canvas atlas.
function CityShops() {
  const environment = useLoftEnvironment()
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const glazingRef = useRef<THREE.InstancedMesh>(null)
  const awningRef = useRef<THREE.InstancedMesh>(null)
  const frameRef = useRef<THREE.InstancedMesh>(null)
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#171d1c', emissiveIntensity: .2, roughness: .92 }), [])
  const glassMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#243b45', emissive: '#b87842', emissiveIntensity: .12,
    roughness: .28, metalness: .28,
  }), [])
  const awningMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .82 }), [])
  const frameMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b2529', metalness: .48, roughness: .52 }), [])
  const signTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1536; canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // The sign plane faces back toward the lounge, reversing its image.
      ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
      ctx.fillStyle = '#1d282c'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      const names = ['BOWERY BOOKS', 'NIGHT OWL', 'FLOWER SHOP', 'CAMERA HOUSE', 'CORNER MARKET']
      names.forEach((name, index) => {
        const left = index * canvas.width / names.length
        ctx.fillStyle = index % 2 ? '#35483e' : '#303e46'
        ctx.fillRect(left + 4, 5, canvas.width / names.length - 8, 118)
        ctx.fillStyle = '#d6c7a5'
        ctx.font = 'bold 22px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(name, left + canvas.width / names.length / 2, 75)
      })
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    texture.wrapS = THREE.RepeatWrapping
    texture.repeat.x = -1
    texture.offset.x = 1
    return texture
  }, [])
  const shopWindowTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1536; canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Face the illustration toward the lounge, matching the sign atlas.
      ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
      const bay = canvas.width / 5
      const palettes = [
        ['#29343a', '#a69c82'], ['#4e372d', '#e0b37e'], ['#283e35', '#86ad8d'],
        ['#26333c', '#899fa9'], ['#3e3b2d', '#c5a879'],
      ]
      palettes.forEach(([background, accent], index) => {
        const left = index * bay + 22
        const right = (index + 1) * bay - 22
        ctx.fillStyle = background; ctx.fillRect(left, 9, right - left, 238)
        ctx.globalAlpha = .2; ctx.fillStyle = accent; ctx.fillRect(left, 9, right - left, 238); ctx.globalAlpha = 1
        ctx.fillStyle = '#1c272a'
        for (let shelf = 0; shelf < 3; shelf++) {
          const y = 74 + shelf * 58
          ctx.fillRect(left + 12, y, right - left - 24, 6)
          for (let item = 0; item < 12; item++) {
            const height = 16 + ((item * 17 + index * 11 + shelf * 7) % 24)
            const x = left + 22 + item * 18
            ctx.fillStyle = item % 4 === 0 ? accent : index === 2 ? '#6b9471' : '#8d9189'
            ctx.fillRect(x, y - height, 10 + (item % 3) * 2, height)
          }
          ctx.fillStyle = '#1c272a'
        }
        ctx.fillStyle = '#d9bc86'; ctx.globalAlpha = .32
        ctx.fillRect(left + 12, 11, right - left - 24, 10)
        ctx.globalAlpha = 1
        const reflection = ctx.createLinearGradient(left, 0, right, 0)
        reflection.addColorStop(0, 'rgba(200,220,225,0)')
        reflection.addColorStop(.55, 'rgba(200,220,225,.12)')
        reflection.addColorStop(.85, 'rgba(200,220,225,0)')
        ctx.fillStyle = reflection; ctx.fillRect(left, 9, right - left, 238)
      })
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.repeat.x = -1; texture.offset.x = 1
    texture.anisotropy = 4
    return texture
  }, [])
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    for (let index = 0; index < 5; index++) {
      const x = (index - 2) * 4.7
      dummy.position.set(x, .58, 32.1)
      dummy.scale.set(4.6, 3.46, 2.55)
      dummy.updateMatrix()
      bodyRef.current?.setMatrixAt(index, dummy.matrix)
      bodyRef.current?.setColorAt(index, new THREE.Color(['#92958b', '#998f81', '#7f9295', '#a09a8d', '#858e85'][index]))
      dummy.position.set(x, .23, 30.808)
      dummy.scale.set(3.95, 1.85, .04)
      dummy.updateMatrix()
      glazingRef.current?.setMatrixAt(index, dummy.matrix)
      dummy.position.set(x, 1.42, 30.55)
      dummy.scale.set(4.15, .1, .78)
      dummy.updateMatrix()
      awningRef.current?.setMatrixAt(index, dummy.matrix)
      awningRef.current?.setColorAt(index, new THREE.Color(['#465854', '#624a42', '#53605c', '#4e5b62', '#665b46'][index]))
      for (let mullion = 0; mullion < 3; mullion++) {
        dummy.position.set(x + (mullion - 1) * 1.27, .23, 30.78)
        dummy.scale.set(.055, 1.88, .11)
        dummy.updateMatrix()
        frameRef.current?.setMatrixAt(index * 3 + mullion, dummy.matrix)
      }
    }
    for (const mesh of [bodyRef.current, glazingRef.current, awningRef.current, frameRef.current]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [])
  useFrame(() => { glassMaterial.emissiveIntensity = .07 + environment.windowGlow * .32 })
  useEffect(() => () => {
    box.dispose(); bodyMaterial.dispose(); glassMaterial.dispose(); awningMaterial.dispose(); frameMaterial.dispose()
    signTexture.dispose(); shopWindowTexture.dispose()
  }, [box, bodyMaterial, glassMaterial, awningMaterial, frameMaterial, signTexture, shopWindowTexture])
  return <group name="downtown shopfronts" position={[0, 0, -1.3]}>
    <mesh position={[0, -1.08, 29.98]}>
      <boxGeometry args={[25.2, .13, 2.1]} />
      <meshStandardMaterial color="#78817d" roughness={.96} />
    </mesh>
    <instancedMesh ref={bodyRef} args={[box, bodyMaterial, 5]} castShadow={false} receiveShadow={false} />
    <instancedMesh ref={glazingRef} args={[box, glassMaterial, 5]} castShadow={false} receiveShadow={false} />
    <mesh position={[0, .23, 30.745]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[23.5, 1.85]} />
      <meshBasicMaterial map={shopWindowTexture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
    <instancedMesh ref={awningRef} args={[box, awningMaterial, 5]} castShadow={false} receiveShadow={false} />
    <instancedMesh ref={frameRef} args={[box, frameMaterial, 15]} castShadow={false} receiveShadow={false} />
    <mesh position={[0, 1.94, 30.785]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[23.5, .92]} />
      <meshBasicMaterial map={signTexture} toneMapped={false} />
    </mesh>
  </group>
}

function ImportedFacade() {
  const url = `${import.meta.env.BASE_URL}models/loft-city/modular_urban_apartments_facade_1k.gltf`
  const { scene } = useGLTF(url)
  const facade = useMemo(() => {
    const clone = scene.clone(true)
    const scale = 0.38
    clone.scale.setScalar(scale)
    clone.position.set(-1.235 * scale, -1.15 + 2 * scale, -14)
    clone.updateMatrixWorld(true)
    return clone
  }, [scene])
  return <primitive object={facade} dispose={null} />
}

class CityAssetBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { /* The authored skyline below remains as the local fallback. */ }
  render() { return this.state.failed ? null : this.props.children }
}

function cloudHash(x: number, y: number, seed: number) {
  const value = Math.sin((x + seed * 13.1) * 127.1 + (y + seed * 7.2) * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function cloudNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const top = THREE.MathUtils.lerp(cloudHash(x0, y0, seed), cloudHash(x0 + 1, y0, seed), sx)
  const bottom = THREE.MathUtils.lerp(cloudHash(x0, y0 + 1, seed), cloudHash(x0 + 1, y0 + 1, seed), sx)
  return THREE.MathUtils.lerp(top, bottom, sy)
}

function cloudFbm(x: number, y: number, seed: number) {
  let total = 0
  let amplitude = 0.5
  let normalization = 0
  for (let octave = 0; octave < 4; octave += 1) {
    total += cloudNoise(x, y, seed + octave * 19.7) * amplitude
    normalization += amplitude
    amplitude *= 0.5
    x *= 2
    y *= 2
  }
  return total / normalization
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function createCloudTexture(seed: number) {
  const width = 512
  const height = 256
  const pixels = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1)
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1)
      const broad = cloudFbm(u * 4.2, v * 3.4, seed)
      const detail = cloudFbm(u * 12.5, v * 10.5, seed + 41)
      const center = 0.5 + (cloudNoise(u * 3.2, 0.65, seed + 23) - 0.5) * 0.18
      const halfHeight = 0.16 + cloudNoise(u * 3.6, 0.25, seed + 67) * 0.15
      const turbulentEdge = (broad - 0.5) * 0.17 + (detail - 0.5) * 0.09
      const edge = halfHeight + turbulentEdge - Math.abs(v - center)
      const wisps = smoothstep(-0.065, 0.075, edge)
      const density = 0.58 + broad * 0.24 + detail * 0.18
      const fadeAtEnds = smoothstep(0, 0.1, u) * (1 - smoothstep(0.9, 1, u))
      const alpha = Math.round(255 * wisps * density * fadeAtEnds)
      const silverLining = smoothstep(.42, .72, v) * .24
      const shading = Math.min(1, .65 + broad * .13 + detail * .07 + silverLining)
      const offset = (y * width + x) * 4
      pixels[offset] = Math.round(255 * shading)
      pixels[offset + 1] = Math.round(255 * shading)
      pixels[offset + 2] = Math.round(255 * Math.min(1, shading + .025))
      pixels[offset + 3] = alpha
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

function WeatherClouds({ count, weather, reducedMotion }: { count: number, weather: Weather, reducedMotion: boolean }) {
  const environment = useLoftEnvironment()
  const root = useRef<THREE.Group>(null)
  const stormy = weather === 'thunderstorm'
  const nightTone = useMemo(() => new THREE.Color(stormy ? '#14212d' : '#343f47'), [stormy])
  const dayTone = useMemo(() => new THREE.Color(stormy ? '#7b8796' : weather === 'clear' ? '#fff4e0' : '#e0e6e6'), [stormy, weather])
  const materials = useMemo(() => Array.from({ length: Math.min(4, count) }, (_, index) => new THREE.MeshBasicMaterial({
    map: createCloudTexture(index + 1),
    color: '#75838a',
    transparent: true,
    opacity: stormy ? .82 : weather === 'rain' ? .72 : weather === 'clear' ? .22 : .64,
    fog: false,
    alphaTest: 0.012,
    depthWrite: false,
    side: THREE.DoubleSide,
  })), [count, stormy, weather])
  const positions = useMemo(() => {
    // Broad cloud banks live beyond the buildings, rather than miniature
    // clouds hovering immediately outside a window.
    const windowCenters: [number, number, number][] = [
      [-22, 15, -60], [18, 22, -66], [-8, 30, -72],
      [32, 12, -68], [-35, 26, -75], [0, 12, -70], [8, 36, -78],
    ]
    return Array.from({ length: count }, (_, index) => ({
      position: windowCenters[index % windowCenters.length],
      scale: [1.15 + (index % 3) * 0.18, 0.88 + (index % 2) * 0.1, 0.9 + (index % 3) * 0.12] as [number, number, number],
      textureIndex: index % materials.length,
    }))
  }, [count, materials.length])

  useFrame(({ clock }) => {
    for (const material of materials) material.color.copy(nightTone).lerp(dayTone, environment.daylight)
    if (root.current && !reducedMotion) root.current.position.x = Math.sin(clock.elapsedTime * .006) * 3
  })
  useEffect(() => () => {
    for (const material of materials) {
      material.map?.dispose()
      material.dispose()
    }
  }, [materials])

  return <group ref={root}>
    {[false, true].map((rear) => <group key={String(rear)} rotation={[0, rear ? Math.PI : 0, 0]} position={[0, 0, rear ? 9 : 0]}>
      {positions.map((cloud, index) => <group key={index} position={cloud.position} scale={cloud.scale}>
        <mesh material={materials[cloud.textureIndex]} castShadow={false} receiveShadow={false}>
          <planeGeometry args={[48, 22]} />
        </mesh>
        {stormy && <mesh position={[0.08, 0.06, -0.16]} scale={[1.12, 0.9, 1]}
          material={materials[(cloud.textureIndex + 1) % materials.length]} castShadow={false} receiveShadow={false}>
          <planeGeometry args={[48, 22]} />
        </mesh>}
      </group>)}
    </group>)}
  </group>
}

function Precipitation({ kind, mobile, reducedMotion }: { kind: 'rain' | 'snow', mobile: boolean, reducedMotion: boolean }) {
  const count = kind === 'rain' ? mobile ? 140 : 520 : mobile ? 80 : 260
  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const data = useMemo(() => {
    const countFloats = count * (kind === 'rain' ? 6 : 3)
    const positions = new Float32Array(countFloats)
    const baseX = new Float32Array(count)
    const baseZ = new Float32Array(count)
    const speed = new Float32Array(count)
    const length = new Float32Array(count)
    for (let index = 0; index < count; index += 1) {
      const x = -12 + Math.random() * 24
      const y = -1 + Math.random() * 21
      const z = -6.4 - Math.random() * 23
      baseX[index] = x
      baseZ[index] = z
      speed[index] = kind === 'rain' ? 5.8 + Math.random() * 4.8 : 0.24 + Math.random() * 0.45
      length[index] = 0.14 + Math.random() * 0.32
      if (kind === 'rain') {
        const offset = index * 6
        positions[offset] = x
        positions[offset + 1] = y
        positions[offset + 2] = z
        positions[offset + 3] = x - .045
        positions[offset + 4] = y + length[index]
        positions[offset + 5] = z
      } else {
        const offset = index * 3
        positions[offset] = x
        positions[offset + 1] = y
        positions[offset + 2] = z
      }
    }
    return { positions, baseX, baseZ, speed, length }
  }, [count, kind])
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    return result
  }, [data])
  const snowTexture = useMemo(() => {
    const pixels = new Uint8Array(32 * 32 * 4)
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4
      const radius = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5)
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255
      pixels[i + 3] = Math.round(255 * (1 - smoothstep(.15, 1, radius)))
    }
    const texture = new THREE.DataTexture(pixels, 32, 32)
    texture.needsUpdate = true
    return texture
  }, [])
  useEffect(() => () => snowTexture.dispose(), [snowTexture])
  const material = useMemo(() => kind === 'rain'
    ? new THREE.LineBasicMaterial({ color: '#c4d8e0', transparent: true, opacity: 0.24, depthWrite: false })
    : new THREE.PointsMaterial({ color: '#e6eef0', map: snowTexture, size: mobile ? .065 : .08, transparent: true, opacity: 0.78, depthWrite: false, sizeAttenuation: true }), [kind, mobile, snowTexture])

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute
    const positions = attribute.array as Float32Array
    const elapsed = clock.elapsedTime
    for (let index = 0; index < count; index += 1) {
      if (kind === 'rain') {
        const offset = index * 6
        let x = positions[offset]
        let y = positions[offset + 1] - data.speed[index] * delta
        if (y < -1) {
          y = 20
          x = data.baseX[index]
        }
        x += delta * (.35 + Math.sin(elapsed * .22) * .12)
        positions[offset] = x
        positions[offset + 1] = y
        positions[offset + 2] = data.baseZ[index]
        positions[offset + 3] = x - .045
        positions[offset + 4] = y + data.length[index]
        positions[offset + 5] = data.baseZ[index]
      } else {
        const offset = index * 3
        let y = positions[offset + 1] - data.speed[index] * delta
        if (y < -1) y = 20
        positions[offset] = data.baseX[index] + Math.sin(elapsed * 0.55 + index) * 0.35
        positions[offset + 1] = y
        positions[offset + 2] = data.baseZ[index]
      }
    }
    attribute.needsUpdate = true
  })
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  return kind === 'rain'
    ? <lineSegments ref={linesRef} geometry={geometry} material={material} frustumCulled={false} />
    : <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
}

function Lightning({ reducedMotion }: { reducedMotion: boolean }) {
  const environment = useLoftEnvironment()
  const light = useRef<THREE.PointLight>(null)
  const nextFlash = useRef(11 + Math.random() * 15)
  const startedAt = useRef(-1)
  const duration = .65

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    if (!light.current) return
    if (environment.weather !== 'thunderstorm' || reducedMotion) {
      light.current.intensity = 0
      return
    }
    if (now >= nextFlash.current) {
      startedAt.current = now
      nextFlash.current = now + 12 + Math.random() * 18
    }
    const elapsed = now - startedAt.current
    const envelope = elapsed >= 0 && elapsed < duration ? Math.sin((elapsed / duration) * Math.PI) : 0
    light.current.intensity = envelope * 7
  })
  return <pointLight ref={light} position={[0, 8, -7.8]} color="#bdd9f5" distance={18} decay={2} intensity={0} />
}

export default function LoftCity({ mobile, reducedMotion }: { mobile: boolean, reducedMotion: boolean }) {
  const { weather } = useLoftEnvironment()
  const cloudCount = weather === 'thunderstorm' ? 7 : weather === 'rain' ? 5 : weather === 'cloudy' || weather === 'snow' ? 4 : weather === 'fog' ? 2 : 1
  const hasRain = weather === 'rain' || weather === 'thunderstorm'

  return <group name="loft exterior city">
    <CityGround />
    <CityShops />
    <Skyline />
    <group rotation={[0, Math.PI, 0]} position={[0, 0, 12]}><Skyline /></group>
    <Suspense fallback={null}>
      <CityAssetBoundary><ImportedFacade /></CityAssetBoundary>
    </Suspense>
    <WeatherClouds count={cloudCount} weather={weather} reducedMotion={reducedMotion} />
    <group rotation={[0, Math.PI, 0]} position={[0, 0, 9]}>
      {hasRain && <Precipitation kind="rain" mobile={mobile} reducedMotion={reducedMotion} />}
      {weather === 'snow' && <Precipitation kind="snow" mobile={mobile} reducedMotion={reducedMotion} />}
    </group>
    {hasRain && <Precipitation kind="rain" mobile={mobile} reducedMotion={reducedMotion} />}
    {weather === 'snow' && <Precipitation kind="snow" mobile={mobile} reducedMotion={reducedMotion} />}
    {weather === 'thunderstorm' && !reducedMotion && <Lightning reducedMotion={reducedMotion} />}
  </group>
}

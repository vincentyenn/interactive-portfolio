import { useEffect, useMemo, useRef, useState } from 'react'
import { Html, RoundedBox, useGLTF, useTexture } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { aboutObjects, type AboutObject } from './roomArtifacts'
import type { Focus } from './LoftScene'

const modelUrl = `${import.meta.env.BASE_URL}models/loft-room.glb`
const portraitUrl = `${import.meta.env.BASE_URL}images/about/goat-day.jpg`
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function FrameModel() {
  const portrait = useTexture(portraitUrl)
  useEffect(() => { portrait.colorSpace = THREE.SRGBColorSpace; portrait.needsUpdate = true }, [portrait])
  return <group>
    <RoundedBox args={[.73, .96, .055]} radius={.012} position={[0, .5, 0]} castShadow>
      <meshStandardMaterial color="#241e1a" roughness={.78} metalness={.04} />
    </RoundedBox>
    <mesh position={[0, .5, .035]}><planeGeometry args={[.645, .87]} /><meshStandardMaterial color="#d8d0bf" roughness={.92} /></mesh>
    <mesh position={[0, .5, .042]}><planeGeometry args={[.555, .74]} /><meshBasicMaterial map={portrait} toneMapped={false} /></mesh>
    <mesh position={[0, .045, -.14]} rotation={[-.25, 0, 0]} castShadow>
      <boxGeometry args={[.06, .38, .035]} /><meshStandardMaterial color="#2c251e" roughness={.8} />
    </mesh>
  </group>
}

function useCameraMark() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 256, 64)
    ctx.fillStyle = '#e5e8e7'; ctx.font = 'bold 43px Arial, sans-serif'; ctx.fillText('SONY', 8, 47)
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    return map
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function SonyCameraModel() {
  const mark = useCameraMark()
  return <group>
    <RoundedBox args={[.7, .42, .22]} radius={.035} position={[0, .27, 0]} castShadow>
      <meshStandardMaterial color="#181b1d" metalness={.3} roughness={.56} />
    </RoundedBox>
    <RoundedBox args={[.17, .36, .29]} radius={.028} position={[-.28, .25, .03]} castShadow>
      <meshStandardMaterial color="#151718" metalness={.18} roughness={.75} />
    </RoundedBox>
    <RoundedBox args={[.18, .11, .16]} radius={.018} position={[.05, .52, -.015]} castShadow>
      <meshStandardMaterial color="#1b1f20" metalness={.25} roughness={.62} />
    </RoundedBox>
    <mesh position={[.04, .27, .255]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[.168, .19, .31, 48]} />
      <meshStandardMaterial color="#1d2326" metalness={.64} roughness={.39} />
    </mesh>
    {[.165, .15, .127].map((radius, index) => <mesh key={radius} position={[.04, .27, .42 + index * .008]}>
      <torusGeometry args={[radius, index === 0 ? .014 : .006, 10, 48]} />
      <meshStandardMaterial color={index === 0 ? '#45525a' : '#161d21'} metalness={.75} roughness={.25} />
    </mesh>)}
    <mesh position={[.04, .27, .443]}><circleGeometry args={[.122, 48]} />
      <meshPhysicalMaterial color="#172c3b" metalness={.45} roughness={.09} clearcoat={1} clearcoatRoughness={.08} />
    </mesh>
    <mesh position={[-.22, .39, .119]}><planeGeometry args={[.15, .038]} /><meshBasicMaterial map={mark} transparent toneMapped={false} /></mesh>
    {[[-.21, .515], [.25, .505]].map(([x, y], index) => <mesh key={index} position={[x, y, -.02]} castShadow>
      <cylinderGeometry args={[index ? .072 : .048, index ? .072 : .048, .042, 24]} />
      <meshStandardMaterial color="#34383a" metalness={.65} roughness={.38} />
    </mesh>)}
    <mesh position={[-.28, .48, .098]}><sphereGeometry args={[.018, 10, 8]} /><meshBasicMaterial color="#b85545" /></mesh>
  </group>
}

function FootballModel({ width }: { width: number }) {
  const { scene } = useGLTF(modelUrl)
  const model = useMemo(() => {
    scene.updateMatrixWorld(true)
    const group = new THREE.Group()
    scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      let owner: THREE.Object3D | null = node
      while (owner && !normalized(owner.name).startsWith('americanfootball')) owner = owner.parent
      if (!owner) return
      const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld)
      const mesh = new THREE.Mesh(geometry, node.material)
      mesh.castShadow = mesh.receiveShadow = true
      group.add(mesh)
    })
    const bounds = new THREE.Box3().setFromObject(group)
    if (!bounds.isEmpty()) {
      const center = bounds.getCenter(new THREE.Vector3())
      const size = bounds.getSize(new THREE.Vector3())
      const factor = width / Math.max(size.x, size.z, .01)
      group.scale.setScalar(factor)
      group.position.set(-center.x * factor, -bounds.min.y * factor, -center.z * factor)
    }
    return group
  }, [scene, width])
  useEffect(() => () => model.traverse((node) => { if (node instanceof THREE.Mesh) node.geometry.dispose() }), [model])
  return <primitive object={model} dispose={null} />
}

function CookingModel() {
  return <group position={[-.11, .4, 0]} rotation={[0, -.12, -.2]}>
    <mesh position={[0, 0, .035]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[.29, .265, .09, 48]} />
      <meshStandardMaterial color="#2d3231" roughness={.45} metalness={.62} />
    </mesh>
    <mesh position={[0, 0, .093]}><torusGeometry args={[.269, .027, 12, 48]} />
      <meshStandardMaterial color="#646967" roughness={.38} metalness={.72} />
    </mesh>
    <mesh position={[0, 0, .094]}><circleGeometry args={[.244, 48]} />
      <meshStandardMaterial color="#171c1d" roughness={.72} metalness={.25} />
    </mesh>
    <RoundedBox args={[.43, .082, .09]} radius={.025} position={[.43, -.012, .025]} castShadow>
      <meshStandardMaterial color="#30231d" roughness={.82} metalness={.06} />
    </RoundedBox>
    <mesh position={[.62, -.012, .076]}><torusGeometry args={[.018, .006, 6, 16]} />
      <meshStandardMaterial color="#a88b6e" roughness={.48} metalness={.55} />
    </mesh>
  </group>
}

export function AboutObjectModel({ id, inspection = false }: { id: AboutObject['id'], inspection?: boolean }) {
  if (id === 'portrait') return <FrameModel />
  if (id === 'camera') return <SonyCameraModel />
  if (id === 'sports') return <FootballModel width={inspection ? .86 : .68} />
  return <CookingModel />
}

const bayX = (column: number) => -1.68 + column * 1.12
const bayCenterY = (row: 0 | 1) => row === 0 ? .68 : -.68
const bayFloorY = (row: 0 | 1) => row === 0 ? .045 : -1.315

function ShelfObject({ item, interactive, selected, onSelect }: { item: AboutObject, interactive: boolean, selected: boolean, onSelect: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [column, row] = item.bay
  return <group position={[bayX(column), 0, 0]}
    onClick={interactive ? (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect() } : undefined}
    onPointerOver={interactive ? () => { setHovered(true); document.body.style.cursor = 'pointer' } : undefined}
    onPointerOut={() => { setHovered(false); document.body.style.cursor = '' }}>
    <group visible={!selected} position={[0, bayFloorY(row), .08]}><AboutObjectModel id={item.id} /></group>
    {interactive && <mesh position={[0, bayCenterY(row), .34]}>
      <boxGeometry args={[1.03, 1.22, .08]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>}
    {interactive && hovered && <mesh position={[0, bayCenterY(row), .39]}>
      <planeGeometry args={[1.02, 1.22]} /><meshBasicMaterial color="#e5bd8f" transparent opacity={.085} depthWrite={false} />
    </mesh>}
    {interactive && <Html><div className="visually-hidden"><button type="button" data-about-artifact-id={item.id}
      onClick={onSelect}>Explore {item.title}</button></div></Html>}
  </group>
}

export function AboutInspectionStage({ item, mobile, reducedMotion }: { item: AboutObject, mobile: boolean, reducedMotion: boolean }) {
  const backdrop = useRef<THREE.Group>(null)
  const backdropMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const model = useRef<THREE.Group>(null)
  const { camera, pointer } = useThree()
  const progress = useRef(reducedMotion ? 1 : 0)
  const start = useMemo(() => new THREE.Vector3(7.07 - .08, 2.04 + bayFloorY(item.bay[1]), .2 + bayX(item.bay[0])), [item])
  const end = useMemo(() => new THREE.Vector3(), [])
  const startRotation = useMemo(() => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2), [])
  const targetRotation = useMemo(() => new THREE.Quaternion(), [])
  useFrame((_, delta) => {
    if (!backdrop.current || !model.current) return
    progress.current = Math.min(1, progress.current + delta / .88)
    const t = reducedMotion ? 1 : 1 - Math.pow(1 - progress.current, 3)
    backdrop.current.position.copy(camera.position).add(end.set(0, 0, -2.3).applyQuaternion(camera.quaternion))
    backdrop.current.quaternion.copy(camera.quaternion)
    if (backdropMaterial.current) backdropMaterial.current.opacity = Math.max(0, Math.min(1, (t - .18) / .65))
    const floor = item.id === 'portrait' ? -.82 : item.id === 'camera' ? -.49 : item.id === 'sports' ? -.35 : -.55
    const finalScale = (item.id === 'portrait' ? 1.75 : item.id === 'camera' ? 1.95 : item.id === 'sports' ? 1.8 : 1.36) * (mobile ? .62 : 1)
    const finalPosition = end.set(mobile ? 0 : item.id === 'cooking' ? -.94 : -.62, mobile ? .8 + floor : floor, .12).applyQuaternion(camera.quaternion).add(backdrop.current.position)
    model.current.position.copy(start).lerp(finalPosition, t)
    targetRotation.copy(camera.quaternion)
    model.current.quaternion.copy(startRotation).slerp(targetRotation, t)
    model.current.scale.setScalar(THREE.MathUtils.lerp(1, finalScale, t))
    if (t === 1 && !reducedMotion) model.current.rotateY(pointer.x * .0008)
  })
  return <>
    <group ref={backdrop}>
      <mesh position={[0, 0, -.5]}><planeGeometry args={[30, 30]} /><meshBasicMaterial ref={backdropMaterial} color="#070809" toneMapped={false} transparent opacity={0} depthWrite={false} /></mesh>
      <pointLight position={[-1.2, 1.25, 1.5]} intensity={10} distance={5} decay={2} color="#f3e7d6" />
      <pointLight position={[.4, -.4, 1.1]} intensity={3} distance={4} decay={2} color="#9eb5c4" />
    </group>
    <group ref={model}><AboutObjectModel id={item.id} inspection /></group>
  </>
}

export default function AboutShelf({ focus, selectedArtifact, onArtifact }: {
  focus: Focus, selectedArtifact: string | null, onArtifact: (id: string) => void
}) {
  const { scene } = useGLTF(modelUrl)
  const wood = useMemo(() => {
    let texture: THREE.Texture | null = null
    scene.traverse((node) => {
      if (!texture && node instanceof THREE.Mesh && normalized(node.name).startsWith('personalshelf')) {
        const material = Array.isArray(node.material) ? node.material[0] : node.material
        if (material instanceof THREE.MeshStandardMaterial) texture = material.map
      }
    })
    return texture
  }, [scene])
  const interactive = focus === 'about' && !selectedArtifact
  return <group name="about wall collection" position={[7.07, 2.04, .2]} rotation={[0, -Math.PI / 2, 0]}>
    <mesh position={[0, 0, -.22]} receiveShadow><boxGeometry args={[4.58, 2.9, .1]} />
      <meshStandardMaterial color="#aa9a89" roughness={.94} />
    </mesh>
    {[-2.31, 2.31].map((x) => <mesh key={x} position={[x, 0, -.02]} castShadow receiveShadow>
      <boxGeometry args={[.16, 3.02, .4]} /><meshStandardMaterial color="#b3a595" roughness={.96} />
    </mesh>)}
    {[-1.48, 1.48].map((y) => <mesh key={y} position={[0, y, -.02]} castShadow receiveShadow>
      <boxGeometry args={[4.62, .16, .4]} /><meshStandardMaterial color="#b3a595" roughness={.96} />
    </mesh>)}
    {Array.from({ length: 34 }, (_, index) => <mesh key={index} position={[.42 + index * .052, 0, -.159]} receiveShadow>
      <boxGeometry args={[.025, 2.82, .035]} /><meshStandardMaterial map={wood} color="#bd9a78" roughness={.83} />
    </mesh>)}
    {[0.02, -1.34].map((y) => <group key={y}>
      <RoundedBox args={[4.34, .105, .37]} radius={.018} position={[0, y, .06]} castShadow receiveShadow>
        <meshStandardMaterial map={wood} color="#b79573" roughness={.82} />
      </RoundedBox>
      <mesh position={[0, y - .067, .095]}><boxGeometry args={[4.18, .018, .018]} />
        <meshBasicMaterial color="#f6c98d" toneMapped={false} />
      </mesh>
    </group>)}
    <pointLight position={[0, .3, .45]} intensity={6} distance={4} color="#ffd4a7" decay={2} />
    {aboutObjects.map((item) => <ShelfObject key={item.id} item={item} interactive={interactive}
      selected={selectedArtifact === item.id}
      onSelect={() => onArtifact(item.id)} />)}
  </group>
}

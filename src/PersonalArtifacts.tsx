import { useEffect, useMemo, useState } from 'react'
import { Html, RoundedBox, useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { AboutSurface, useSurface, wrap } from './ObjectSurfaces'
import { roomArtifacts, shelfPoint, type Artifact } from './roomArtifacts'
import type { Focus } from './LoftScene'

const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function ExistingProp({ prefix, width, position }: {
  prefix: string, width: number, position: [number, number, number]
}) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/loft-room.glb`)
  const band = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.18, -.06, -.13), new THREE.Vector3(-.2, .19, -.13),
    new THREE.Vector3(0, .27, -.13), new THREE.Vector3(.2, .19, -.13),
    new THREE.Vector3(.18, -.06, -.13),
  ]), [])
  const model = useMemo(() => {
    scene.updateMatrixWorld(true)
    const group = new THREE.Group()
    scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      let owner: THREE.Object3D | null = node
      while (owner && !key(owner.name).startsWith(prefix)) owner = owner.parent
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
  }, [scene, prefix, width])
  useEffect(() => () => model.traverse((node) => { if (node instanceof THREE.Mesh) node.geometry.dispose() }), [model])
  return <group position={position}><primitive object={model} dispose={null} />
    {prefix === 'headphone' && <mesh position={[0, .32, .13]} castShadow>
      <tubeGeometry args={[band, 32, .026, 10, false]} />
      <meshStandardMaterial color="#212625" roughness={.75} />
    </mesh>}
  </group>
}

function ArtifactPrint({ item, selected, focused, onSelect, onBack, width, height }: {
  item: Artifact, selected: boolean, focused: boolean, onSelect: () => void,
  onBack: () => void, width: number, height: number
}) {
  const pixelsHigh = Math.round(1200 * height / width)
  const { ctx, texture } = useSurface(1200, pixelsHigh)
  useEffect(() => {
    const ink = '#293e3b'
    const paper = item.id === 'usaa' ? '#e5e8e2' : '#ece5d5'
    const accent = item.id === 'education' ? '#70403e' : '#537b7a'
    ctx.fillStyle = paper; ctx.fillRect(0, 0, 1200, pixelsHigh)
    ctx.strokeStyle = focused ? '#cf9850' : '#bab6a6'
    ctx.lineWidth = focused ? 8 : 2; ctx.strokeRect(22, 22, 1156, pixelsHigh - 44)
    ctx.fillStyle = accent; ctx.font = '25px monospace'
    ctx.fillText(item.kicker.toUpperCase(), 62, 76)
    ctx.textAlign = 'right'; ctx.fillText(selected ? '[ BACK ]' : '[ OPEN ]', 1135, 76); ctx.textAlign = 'left'
    ctx.fillStyle = ink; ctx.font = item.id === 'usaa' ? 'bold 110px sans-serif' : 'bold 66px Georgia'
    let y = wrap(ctx, item.title, 62, 177, 1070, 78)
    if (!selected) {
      if (item.id === 'usaa') {
        ctx.fillStyle = '#385c69'; ctx.fillRect(62, y + 45, 1076, 270)
        ctx.fillStyle = '#e9eddd'; ctx.font = 'bold 68px monospace'; ctx.fillText('VINCENT YEN', 110, y + 145)
        ctx.font = '30px monospace'; ctx.fillText('SOFTWARE ENGINEERING', 110, y + 208)
        y += 370
      } else if (item.id === 'utd') {
        const labels = ['SOURCE TEXT', 'ML TOOLS', 'SIMPLER TEXT']
        ctx.strokeStyle = '#537b7a'; ctx.lineWidth = 4; ctx.font = '23px monospace'
        labels.forEach((label, i) => {
          ctx.strokeRect(62 + i * 365, y + 55, 330, 150)
          ctx.fillText(label, 86 + i * 365, y + 142)
          if (i < 2) ctx.fillText('→', 398 + i * 365, y + 140)
        })
        y += 260
      } else if (item.id === 'education') {
        ctx.font = 'bold 102px Georgia'; ctx.fillStyle = '#70403e'; ctx.fillText('A&M', 62, y + 130); y += 205
      }
    }
    ctx.fillStyle = ink; ctx.font = selected ? '40px sans-serif' : '33px sans-serif'
    y = wrap(ctx, item.body, 62, y + 48, 1055, selected ? 58 : 49)
    ctx.strokeStyle = '#aeb8aa'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(62, y + 16); ctx.lineTo(1138, y + 16); ctx.stroke()
    ctx.fillStyle = accent; ctx.font = '29px monospace'
    for (const note of item.notes) y = wrap(ctx, note, 62, y + 55, 1050, 43)
    ctx.fillStyle = accent; ctx.font = '24px monospace'
    ctx.fillText(selected ? 'ESC / RETURN TO EXPERIENCE' : 'VINCENT YEN / EXPERIENCE', 62, pixelsHigh - 55)
    texture.needsUpdate = true
  }, [ctx, texture, item, selected, focused, pixelsHigh])
  return <mesh position={[0, 0, .055]} onClick={(event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (!selected) onSelect()
    else if (event.uv && event.uv.y > .88 && event.uv.x > .75) onBack()
  }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
    <planeGeometry args={[width, height]} />
    <meshStandardMaterial map={texture} roughness={.88} />
  </mesh>
}

function CollectionObject({ item, focus, selected, onSelect, onBack }: {
  item: Artifact, focus: Focus, selected: boolean, onSelect: () => void, onBack: () => void
}) {
  const [focused, setFocused] = useState(false)
  const interactive = focus === item.section

  if (item.id === 'about-me') return <group position={item.position} rotation={[0, -Math.PI / 2, 0]}>
    <RoundedBox args={[item.width + .075, item.height + .075, .085]} radius={.012} castShadow>
      <meshStandardMaterial color="#596b5d" metalness={.12} roughness={.62} />
    </RoundedBox>
    <AboutSurface selected={selected} focused={focused || selected} width={item.width} height={item.height}
      onOpen={onSelect} onBack={onBack} />
  </group>

  return <group position={item.position}>
    <RoundedBox args={[item.width + .075, item.height + .075, .085]} radius={.012} castShadow>
      <meshStandardMaterial color={item.id === 'usaa' ? '#64736b' : '#242927'} metalness={.4} roughness={.5} />
    </RoundedBox>
    {item.id === 'usaa' && <mesh position={[0, item.height / 2 + .12, -.01]}>
      <boxGeometry args={[.075, .2, .02]} /><meshStandardMaterial color="#303c43" roughness={.9} />
    </mesh>}
    <ArtifactPrint item={item} selected={selected} focused={focused} width={item.width} height={item.height}
      onSelect={onSelect} onBack={onBack} />
    {interactive && <Html><div className="visually-hidden" onFocusCapture={() => setFocused(true)} onBlurCapture={() => setFocused(false)}>
      <button autoFocus={selected} onClick={selected ? onBack : onSelect}>
        {selected ? 'Back to experience wall' : `Explore ${item.title}`}
      </button>
      {selected && <section aria-label={item.title}><h2>{item.title}</h2><p>{item.body}</p>
        {item.notes.map((note) => <p key={note}>{note}</p>)}
      </section>}
    </div></Html>}
  </group>
}

function FloatingWallShelves() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/loft-room.glb`)
  const wood = useMemo(() => {
    let material: THREE.Material | undefined
    scene.traverse((node) => {
      if (!material && node instanceof THREE.Mesh && key(node.name).startsWith('personalshelf')) {
        material = Array.isArray(node.material) ? node.material[0] : node.material
      }
    })
    return material
  }, [scene])
  return <group name="floating wall shelves" position={[7.42, 0, .2]} rotation={[0, -Math.PI / 2, 0]}>
    {[.62, 1.43, 2.27].map((height) => <group key={height} position={[0, height, .04]}>
      <RoundedBox args={[2.4, .095, .94]} radius={.015} castShadow receiveShadow>
        {wood ? <primitive object={wood} attach="material" /> : <meshStandardMaterial color="#71543b" roughness={.8} />}
      </RoundedBox>
      <mesh position={[0, -.029, -.437]}><boxGeometry args={[2.28, .035, .025]} /><meshStandardMaterial color="#292c26" roughness={.8} /></mesh>
      <mesh position={[0, -.051, -.36]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.1, .018]} /><meshBasicMaterial color="#ddbb86" /></mesh>
    </group>)}
  </group>
}

// These personal objects stay as shelf decor; the single About Me folio holds all of their context.
function ShelfPersonalityProps() {
  return <group name="personal shelf objects">
    <group position={shelfPoint(-.5, 1.76, .45)} rotation={[0, -Math.PI / 2, 0]}>
      <ExistingProp prefix="vintagevideocamera" width={.48} position={[.36, -.28, -.1]} />
    </group>
    <group position={shelfPoint(.52, 1.79, .24)} rotation={[0, -Math.PI / 2, 0]}>
      <ExistingProp prefix="headphone" width={.53} position={[0, -.32, -.13]} />
    </group>
    <group position={shelfPoint(-.5, .91, .3)} rotation={[0, -Math.PI / 2, 0]}>
      <ExistingProp prefix="americanfootball" width={.57} position={[0, -.2, -.11]} />
    </group>
  </group>
}

export default function PersonalArtifacts({ focus, selectedArtifact, onArtifact, onFocus }: {
  focus: Focus, selectedArtifact: string | null,
  onArtifact: (id: string) => void, onFocus: (focus: Focus) => void
}) {
  return <group name="personal collections">
    <FloatingWallShelves />
    <ShelfPersonalityProps />
    <pointLight position={[5.7, 3.4, -.6]} intensity={14} color="#ffe0b9" distance={5.5} decay={2} />
    {roomArtifacts.map((item) => <CollectionObject key={item.id} item={item} focus={focus}
      selected={selectedArtifact === item.id && focus === item.section}
      onSelect={() => onArtifact(item.id)} onBack={() => onFocus(item.section)} />)}
  </group>
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Html, RoundedBox, useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useSurface, wrap } from './ObjectSurfaces'
import { roomArtifacts, type Artifact } from './roomArtifacts'
import type { Focus } from './LoftScene'

const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function ExistingProp({ prefix, width, position, spin = false, reducedMotion }: {
  prefix: string, width: number, position: [number, number, number], spin?: boolean, reducedMotion: boolean
}) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/loft-room.glb`)
  const pivot = useRef<THREE.Group>(null)
  const band = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(-.18, -.06, -.13), new THREE.Vector3(-.2, .19, -.13), new THREE.Vector3(0, .27, -.13), new THREE.Vector3(.2, .19, -.13), new THREE.Vector3(.18, -.06, -.13)]), [])
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
  useFrame((_, delta) => {
    if (pivot.current) pivot.current.rotation.y = THREE.MathUtils.damp(pivot.current.rotation.y, spin ? .8 : 0, reducedMotion ? 1000 : 5, delta)
  })
  return <group position={position} ref={pivot}><primitive object={model} dispose={null} />
    {prefix === 'headphone' && <mesh position={[0, .32, .13]} castShadow><tubeGeometry args={[band, 32, .026, 10, false]} /><meshStandardMaterial color="#212625" roughness={.75} /></mesh>}
  </group>
}

function ArtifactPrint({ item, selected, focused, onSelect, onBack, onAction, dark = false, width, height }: {
  item: Artifact, selected: boolean, focused: boolean, onSelect: () => void, onBack: () => void,
  onAction?: () => void, dark?: boolean, width: number, height: number
}) {
  const pixelsHigh = Math.round(1200 * height / width)
  const { ctx, texture } = useSurface(1200, pixelsHigh)
  useEffect(() => {
    const paper = dark ? '#10221e' : item.id === 'usaa' ? '#e5e8e2' : '#ece5d5'
    const ink = dark ? '#d5e4cd' : '#293e3b'
    const accent = dark ? '#e6bb7d' : item.id === 'education' ? '#70403e' : '#537b7a'
    ctx.fillStyle = paper; ctx.fillRect(0, 0, 1200, pixelsHigh)
    ctx.strokeStyle = focused ? '#cf9850' : dark ? '#698274' : '#bab6a6'
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
      } else if (item.id === 'portrait') {
        ctx.font = '120px Georgia'; ctx.fillText('V / Y', 62, y + 120); y += 180
      }
    }
    ctx.fillStyle = ink; ctx.font = selected ? '40px sans-serif' : '33px sans-serif'
    y = wrap(ctx, item.body, 62, y + 48, 1055, selected ? 58 : 49)
    ctx.strokeStyle = dark ? '#546f5f' : '#aeb8aa'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(62, y + 16); ctx.lineTo(1138, y + 16); ctx.stroke()
    ctx.fillStyle = accent; ctx.font = '29px monospace'
    for (const note of item.notes) y = wrap(ctx, note, 62, y + 55, 1050, 43)
    ctx.fillStyle = accent; ctx.font = '24px monospace'
    ctx.fillText(selected && onAction ? '[ TURN OBJECT ]' : selected ? 'ESC / RETURN TO COLLECTION' : 'VINCENT YEN / PERSONAL COLLECTION', 62, pixelsHigh - 55)
    texture.needsUpdate = true
  }, [ctx, texture, item, selected, focused, dark, pixelsHigh, onAction])
  return <mesh position={[0, 0, .055]} onClick={(event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (!selected) onSelect()
    else if (event.uv && event.uv.y > .88 && event.uv.x > .75) onBack()
    else onAction?.()
  }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
    <planeGeometry args={[width, height]} />
    <meshStandardMaterial map={texture} roughness={.88} emissiveMap={dark ? texture : null}
      emissive={dark ? '#ffffff' : '#000000'} emissiveIntensity={dark ? .38 : 0} />
  </mesh>
}

function Book({ open, reducedMotion }: { open: boolean, reducedMotion: boolean }) {
  const cover = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (cover.current) cover.current.rotation.y = THREE.MathUtils.damp(cover.current.rotation.y, open ? -2.5 : 0, reducedMotion ? 1000 : 5, delta)
  })
  return <>
    <RoundedBox args={[.73, .57, .09]} radius={.008} position={[0, 0, -.018]}><meshStandardMaterial color="#c9c0a8" roughness={.95} /></RoundedBox>
    <group ref={cover} position={[-.365, 0, .05]}>
      <RoundedBox args={[.73, .57, .018]} radius={.006} position={[.365, 0, 0]}><meshStandardMaterial color="#556c58" roughness={.93} /></RoundedBox>
    </group>
  </>
}

function CollectionObject({ item, focus, selected, reducedMotion, onSelect, onBack }: {
  item: Artifact, focus: Focus, selected: boolean, reducedMotion: boolean, onSelect: () => void, onBack: () => void
}) {
  const [focused, setFocused] = useState(false)
  const [turned, setTurned] = useState(false)
  const control = useRef<HTMLButtonElement>(null)
  const isAbout = item.section === 'about'
  const visiblePrint = !isAbout || item.id === 'portrait' || item.id === 'cookbook' || selected
  const interactive = focus === item.section
  const action = item.id === 'football' || item.id === 'headphones' ? () => setTurned((value) => !value) : undefined
  // Framed writing stays on the object: no viewport-aligned text panel.
  return <group position={item.position} rotation={[0, isAbout ? -Math.PI / 2 : 0, 0]}>
    {!isAbout && <>
      <RoundedBox args={[item.width + .075, item.height + .075, .085]} radius={.012} castShadow>
        <meshStandardMaterial color={item.id === 'usaa' ? '#64736b' : '#242927'} metalness={.4} roughness={.5} />
      </RoundedBox>
      {item.id === 'usaa' && <mesh position={[0, item.height / 2 + .12, -.01]}><boxGeometry args={[.075, .2, .02]} /><meshStandardMaterial color="#303c43" roughness={.9} /></mesh>}
    </>}
    {item.id === 'camcorder' && <>
      <ExistingProp prefix="vintagevideocamera" width={.48} position={[.36, -.28, -.1]} reducedMotion={reducedMotion} />
      {selected && <RoundedBox args={[item.width + .04, item.height + .04, .065]} radius={.018} position={[0, 0, .012]}><meshStandardMaterial color="#171e1d" /></RoundedBox>}
    </>}
    {item.id === 'headphones' && <ExistingProp prefix="headphone" width={.53} position={[0, -.32, -.13]} spin={turned} reducedMotion={reducedMotion} />}
    {item.id === 'football' && <ExistingProp prefix="americanfootball" width={.57} position={[0, -.2, -.11]} spin={turned} reducedMotion={reducedMotion} />}
    {item.id === 'cookbook' && <Book open={selected} reducedMotion={reducedMotion} />}
    {item.id === 'portrait' && <RoundedBox args={[.83, .69, .06]} radius={.012}><meshStandardMaterial color="#453f34" roughness={.75} /></RoundedBox>}
    {visiblePrint && <group position={item.id === 'football' || item.id === 'headphones' ? [0, -.22, .3] : [0, 0, item.id === 'cookbook' && !selected ? .014 : 0]}>
      {(item.id === 'football' || item.id === 'headphones') && <mesh><boxGeometry args={[item.width + .02, item.height + .02, .025]} /><meshStandardMaterial color="#ded6bf" /></mesh>}
      <ArtifactPrint item={item} selected={selected} focused={focused} width={item.width} height={item.height}
        dark={item.id === 'camcorder'} onSelect={onSelect} onBack={onBack} onAction={action} />
    </group>}
    {!visiblePrint && <group position={[0, -.27, .32]}>
      <mesh><boxGeometry args={[.62, .105, .022]} /><meshStandardMaterial color="#dbd0b9" /></mesh>
      <ShelfLabel text={item.title} onClick={onSelect} />
    </group>}
    {interactive && !selected && <mesh onClick={(event) => { event.stopPropagation(); onSelect() }}>
      <boxGeometry args={[item.width, item.height, .65]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>}
    {interactive && <Html><div className="visually-hidden" onFocusCapture={() => setFocused(true)} onBlurCapture={() => setFocused(false)}>
      <button ref={control} key={selected ? 'back' : 'open'} autoFocus={selected} onClick={selected ? onBack : onSelect}>{selected ? `Back to ${item.section === 'about' ? 'shelf' : 'experience wall'}` : `Explore ${item.title}`}</button>
      {selected && <section aria-label={item.title}><h2>{item.title}</h2><p>{item.body}</p>{item.notes.map((note) => <p key={note}>{note}</p>)}{action && <button onClick={action}>Turn {item.title}</button>}</section>}
    </div></Html>}
  </group>
}

function ShelfLabel({ text, onClick }: { text: string, onClick: () => void }) {
  const { ctx, texture } = useSurface(700, 110)
  useEffect(() => {
    ctx.fillStyle = '#dbd0b9'; ctx.fillRect(0, 0, 700, 110)
    ctx.fillStyle = '#283b35'; ctx.font = '25px monospace'; ctx.fillText(text.toUpperCase(), 25, 64); texture.needsUpdate = true
  }, [text, ctx, texture])
  return <mesh position={[0, 0, .015]} onClick={(event) => { event.stopPropagation(); onClick() }}>
    <planeGeometry args={[.61, .096]} /><meshStandardMaterial map={texture} roughness={.9} />
  </mesh>
}

function FloatingWallShelves() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/loft-room.glb`)
  const wood = useMemo(() => {
    let material: THREE.Material | undefined
    scene.traverse((node) => {
      if (!material && node instanceof THREE.Mesh && key(node.name).startsWith('personalshelf')) material = Array.isArray(node.material) ? node.material[0] : node.material
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

export default function PersonalArtifacts({ focus, selectedArtifact, reducedMotion, onArtifact, onFocus }: {
  focus: Focus, selectedArtifact: string | null, reducedMotion: boolean,
  onArtifact: (id: string) => void, onFocus: (focus: Focus) => void
}) {
  return <group name="personal collections">
    <FloatingWallShelves />
    <pointLight position={[5.7, 3.4, -.6]} intensity={14} color="#ffe0b9" distance={5.5} decay={2} />
    {roomArtifacts.map((item) => <CollectionObject key={item.id} item={item} focus={focus}
      selected={selectedArtifact === item.id && focus === item.section} reducedMotion={reducedMotion}
      onSelect={() => onArtifact(item.id)} onBack={() => onFocus(item.section)} />)}
  </group>
}

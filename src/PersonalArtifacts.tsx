import { useEffect, useState } from 'react'
import { Html, RoundedBox } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useSurface, wrap } from './ObjectSurfaces'
import { aboutObjects, roomArtifacts, type Artifact } from './roomArtifacts'
import AboutShelf, { AboutInspectionStage } from './AboutShelf'
import type { Focus } from './LoftScene'

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

export default function PersonalArtifacts({ focus, selectedArtifact, mobile, reducedMotion, onArtifact, onFocus }: {
  focus: Focus, selectedArtifact: string | null, mobile: boolean, reducedMotion: boolean,
  onArtifact: (id: string) => void, onFocus: (focus: Focus) => void
}) {
  const selectedAbout = aboutObjects.find((item) => item.id === selectedArtifact)
  return <group name="personal collections">
    <AboutShelf focus={focus} selectedArtifact={selectedArtifact} onArtifact={onArtifact} />
    <pointLight position={[5.7, 3.4, -.6]} intensity={14} color="#ffe0b9" distance={5.5} decay={2} />
    {roomArtifacts.map((item) => <CollectionObject key={item.id} item={item} focus={focus}
      selected={selectedArtifact === item.id && focus === item.section}
      onSelect={() => onArtifact(item.id)} onBack={() => onFocus(item.section)} />)}
    {selectedAbout && focus === 'about' && <AboutInspectionStage item={selectedAbout} mobile={mobile} reducedMotion={reducedMotion} />}
  </group>
}

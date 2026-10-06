import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { AboutObject } from './roomArtifacts'

export default function AboutObjectOverlay({ item, sceneAvailable, onClose }: {
  item: AboutObject
  sceneAvailable: boolean
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }) }, [item.id])
  const keepFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Tab') { event.preventDefault(); closeRef.current?.focus() }
  }

  return <section className="about-inspection" role="dialog" aria-modal="true" aria-labelledby="about-inspection-title"
    onKeyDown={keepFocus}>
    <div className="about-inspection-visual" aria-hidden="true">
      {!sceneAvailable && <div className="about-inspection-fallback">
        {item.photos?.[0]
          ? <img src={`${import.meta.env.BASE_URL}${item.photos[0].src}`} alt="" />
          : <span>{item.kicker}</span>}
      </div>}
    </div>
    <div className="about-inspection-info">
      <button ref={closeRef} type="button" className="about-inspection-close" onClick={onClose}>Close <span>[ESC]</span></button>
      <div className="about-inspection-content">
        <p className="about-inspection-kicker">THE LOFT / PERSONAL COLLECTION / {item.kicker}</p>
        <h2 id="about-inspection-title">{item.title}</h2>
        <dl className="about-inspection-facts">
          {item.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
        </dl>
        <p className="about-inspection-body">{item.body}</p>
        {item.photos && <div className="about-inspection-photos" aria-label="Photos from Vincent's life">
          {item.photos.map((photo) => <figure key={photo.src}>
            <img src={`${import.meta.env.BASE_URL}${photo.src}`} alt={photo.alt} />
            <figcaption>{photo.caption}</figcaption>
          </figure>)}
        </div>}
      </div>
    </div>
  </section>
}

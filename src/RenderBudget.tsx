import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Focus } from './LoftScene'

export function RenderBudget({ mobile, focus, selectedProject, selectedArtifact }: {
  mobile: boolean, focus: Focus, selectedProject: number | null, selectedArtifact: string | null
}) {
  const { gl, setDpr, clock, setFrameloop, invalidate } = useThree()
  const activeUntil = useRef(0)
  const lastShadow = useRef(0)
  const frames = useRef({ count: 0, elapsed: 0, stable: 0, cooldown: 0 })
  useEffect(() => {
    const previous = gl.shadowMap.autoUpdate
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => { gl.shadowMap.autoUpdate = previous }
  }, [gl])
  useEffect(() => {
    activeUntil.current = clock.elapsedTime + 2.6
    gl.shadowMap.needsUpdate = true
  }, [clock, gl, focus, selectedProject, selectedArtifact])
  useEffect(() => {
    const changeLoop = (mode: 'never' | 'always') => {
      const elapsed = clock.elapsedTime
      setFrameloop(mode)
      clock.elapsedTime = elapsed
    }
    const visibility = () => {
      // Avoid GPU work in hidden tabs; continue the same visit when restored.
      changeLoop(document.hidden ? 'never' : 'always')
      frames.current = { count: 0, elapsed: 0, stable: 0, cooldown: 0 }
      if (!document.hidden) { gl.shadowMap.needsUpdate = true; invalidate() }
    }
    document.addEventListener('visibilitychange', visibility)
    visibility()
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      changeLoop('always')
    }
  }, [clock, gl, invalidate, setFrameloop])
  useFrame((_, delta) => {
    // Camera movement doesn't change a light's depth map. Moving paper/book
    // silhouettes do; refresh those at 15 Hz until their transition settles.
    if ((clock.elapsedTime < activeUntil.current || (focus === 'about' && selectedArtifact)) &&
      clock.elapsedTime - lastShadow.current >= 1 / 15) {
      gl.shadowMap.needsUpdate = true
      lastShadow.current = clock.elapsedTime
    }
    if (document.hidden || delta > .25 || clock.elapsedTime < 5) return
    const window = frames.current
    window.elapsed += delta; window.count++
    if (window.elapsed < 3) return
    const fps = window.count / window.elapsed
    const ceiling = Math.min(globalThis.devicePixelRatio || 1, mobile ? 1.15 : 1.5)
    const current = gl.getPixelRatio()
    if (fps < 43 && current > 1) {
      setDpr(Math.max(1, Math.round((current - .15) * 100) / 100))
      window.stable = 0; window.cooldown = 4
    } else if (fps > 57 && current < ceiling && window.cooldown <= 0) {
      window.stable++
      if (window.stable >= 5) { setDpr(Math.min(ceiling, current + .1)); window.stable = 0 }
    } else window.stable = 0
    window.cooldown--
    window.count = 0; window.elapsed = 0
  })
  return null
}

// Development-only, DOM-readable counters for local performance inspection.
export function RenderStats() {
  const sample = useRef({ elapsed: 0, frames: 0 })
  useFrame(({ gl }, delta) => {
    if (!import.meta.env.DEV || document.hidden) return
    sample.current.elapsed += delta
    sample.current.frames++
    if (sample.current.elapsed < 2) return
    gl.domElement.dataset.renderStats = JSON.stringify({
      fps: Math.round(sample.current.frames / sample.current.elapsed),
      calls: gl.info.render.calls, triangles: gl.info.render.triangles,
      dpr: gl.getPixelRatio(), width: gl.domElement.width, height: gl.domElement.height,
    })
    sample.current = { elapsed: 0, frames: 0 }
  }, 2)
  return null
}

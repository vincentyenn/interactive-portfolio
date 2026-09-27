import { useEffect, useRef, useState } from 'react'
import type { ThreeViewer } from 'threepipe/dist'

type ViewerState = 'loading' | 'ready' | 'failed'

export default function ThreepipeAssetPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<ViewerState>('loading')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let active = true
    let viewer: ThreeViewer | undefined
    let resizeObserver: ResizeObserver | undefined

    const load = async () => {
      try {
        const {
          DirectionalLight,
          HemisphereLight,
          SSAOPlugin,
          ThreeViewer: Viewer,
        } = await import('threepipe/dist')
        if (!active) return

        viewer = new Viewer({
          canvas,
          backgroundColor: '#20231f',
          msaa: true,
          renderScale: Math.min(window.devicePixelRatio || 1, 1.5),
        })
        const softbox = new HemisphereLight('#e8e4dc', '#32271e', 0.8)
        viewer.scene.add(softbox)

        const keyLight = new DirectionalLight('#ffe0b9', 2)
        keyLight.position.set(2.5, 3.5, 4)
        viewer.scene.add(keyLight)

        const rimLight = new DirectionalLight('#a8c8d0', 0.85)
        rimLight.position.set(-3, 1.5, -2)
        viewer.scene.add(rimLight)

        viewer.addPluginSync(new SSAOPlugin(undefined, 0.65, true))

        await viewer.setEnvironmentMap(`${import.meta.env.BASE_URL}environments/studio_small_03_1k.hdr`)
        viewer.scene.environmentIntensity = 0.42
        const model = await viewer.load(
          `${import.meta.env.BASE_URL}models/vintage_video_camera/vintage_video_camera_1k.gltf`,
          { autoCenter: true, autoScale: true },
        )
        if (!active || !model) return

        await viewer.fitToView(undefined, 1.12, 0)
        const controls = viewer.scene.mainCamera.controls as {
          enablePan?: boolean
          enableZoom?: boolean
          autoRotate?: boolean
        } | undefined
        if (controls) {
          controls.enablePan = false
          controls.enableZoom = false
          controls.autoRotate = false
        }
        viewer.setDirty()
        resizeObserver = new ResizeObserver(() => viewer?.resize())
        resizeObserver.observe(canvas.parentElement ?? canvas)
        setState('ready')
      } catch {
        if (active) setState('failed')
        viewer?.dispose()
        viewer = undefined
      }
    }

    void load()

    return () => {
      active = false
      resizeObserver?.disconnect()
      viewer?.dispose()
    }
  }, [])

  return <figure className={`threepipe-preview ${state === 'ready' ? 'is-ready' : ''}`}>
    <canvas ref={canvasRef} aria-label="Interactive 3D vintage camcorder. Drag to rotate." tabIndex={0} />
    {state !== 'ready' && <div className="threepipe-preview-state" role="status">
      {state === 'loading' ? 'Loading the camcorder…' : 'Camcorder preview unavailable'}
    </div>}
    {state === 'ready' && <figcaption>DRAG TO ROTATE</figcaption>}
  </figure>
}

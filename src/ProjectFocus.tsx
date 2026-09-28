import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { projectView } from './loftLayout'

// Depth-aware focus keeps the real raised paper sharp. A CSS blur would also
// blur its printed text now that the text is part of the WebGL scene.
export default function ProjectFocus({ active, mobile }: { active: boolean, mobile: boolean }) {
  const { size, viewport } = useThree()
  const resources = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
    target.depthTexture = new THREE.DepthTexture(1, 1)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        image: { value: target.texture }, depth: { value: target.depthTexture },
        pixel: { value: new THREE.Vector2() }, near: { value: .1 }, far: { value: 100 },
        focusDistance: { value: 4.2 },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D image; uniform sampler2D depth;
        uniform vec2 pixel; uniform float near; uniform float far; uniform float focusDistance;
        varying vec2 vUv;
        void main() {
          float z = texture2D(depth, vUv).x * 2.0 - 1.0;
          float distance = 2.0 * near * far / (far + near - z * (far - near));
          float blur = smoothstep(focusDistance, focusDistance + 1.4, distance);
          vec3 sharp = texture2D(image, vUv).rgb;
          vec3 soft = sharp * .2;
          for (int i = 0; i < 8; i++) {
            float angle = float(i) * .785398;
            soft += texture2D(image, vUv + vec2(cos(angle), sin(angle)) * pixel * 4.0).rgb * .1;
          }
          gl_FragColor = vec4(mix(sharp, soft * .78, blur), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false,
    })
    const geometry = new THREE.PlaneGeometry(2, 2)
    const scene = new THREE.Scene()
    scene.add(new THREE.Mesh(geometry, material))
    return { target, material, geometry, scene, camera: new THREE.Camera() }
  }, [])
  useEffect(() => {
    const ratio = viewport.dpr
    resources.target.setSize(active ? Math.round(size.width * ratio) : 1, active ? Math.round(size.height * ratio) : 1)
    resources.material.uniforms.pixel.value.set(1 / size.width, 1 / size.height)
    resources.material.uniforms.focusDistance.value = projectView.cameraHeight - (mobile ? projectView.mobilePaperHeight : projectView.paperHeight) + .25
  }, [active, mobile, resources, size, viewport.dpr])
  useEffect(() => () => {
    resources.target.depthTexture?.dispose()
    resources.target.dispose(); resources.material.dispose(); resources.geometry.dispose()
  }, [resources])
  useFrame(({ gl, scene, camera }) => {
    if (!active) { gl.render(scene, camera); return }
    const perspective = camera as THREE.PerspectiveCamera
    resources.material.uniforms.near.value = perspective.near
    resources.material.uniforms.far.value = perspective.far
    gl.setRenderTarget(resources.target)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    gl.render(resources.scene, resources.camera)
  }, 1)
  return null
}

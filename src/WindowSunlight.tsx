import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLoftEnvironment } from './LoftEnvironment'
import { shellPoint } from './loftLayout'

// Soft, depth-tested slices approximate the small amount of airborne dust lit
// through each clerestory. No fullscreen blur or extra scene render is needed.
export default function WindowSunlight({ mobile, reducedMotion }: { mobile: boolean, reducedMotion: boolean }) {
  const environment = useLoftEnvironment()
  const resources = useMemo(() => {
    const slices = mobile ? 8 : 16
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (const windowX of [-4.5, -2.75, -1]) {
      const [x, , z] = shellPoint([windowX, 0, -4.44])
      for (let slice = 0; slice < slices; slice++) {
        const v = (slice + .5) / slices
        const y = 3.52 + v * 2.12
        // The two western windows terminate on the mezzanine, not through it.
        const endY = windowX < -1 ? 3.34 : .16
        const travel = (y - endY) / .62
        const w = .77
        const start = positions.length / 3
        positions.push(x-w,y,z, x+w,y,z, x+w+travel*.44,endY,z+travel, x-w+travel*.44,endY,z+travel)
        uvs.push(0,0, 1,0, 1,1, 0,1)
        indices.push(start,start+1,start+2, start,start+2,start+3)
      }
    }
    // The lounge's full-height glazing catches the same daylight. These share
    // the studio shaft geometry and shader, so they add no extra draw call.
    for (const windowX of [-3.8, 0, 3.8]) {
      const [x, , z] = shellPoint([windowX, 0, 14.1])
      for (let slice = 0; slice < slices; slice++) {
        const v = (slice + .5) / slices
        const y = 2.7 + v * 2.8
        const endY = .2
        const travel = 2.3 + v * .9
        const w = 1.1
        const start = positions.length / 3
        positions.push(x-w,y,z, x+w,y,z, x+w-travel*.22,endY,z-travel, x-w-travel*.22,endY,z-travel)
        uvs.push(0,0, 1,0, 1,1, 0,1)
        indices.push(start,start+1,start+2, start,start+2,start+3)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    const material = new THREE.ShaderMaterial({
      uniforms: { strength: { value: 0 }, time: { value: 0 }, tint: { value: new THREE.Color('#ffe2ad') } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float strength;
        uniform float time;
        uniform vec3 tint;
        varying vec2 vUv;
        void main() {
          float edge = smoothstep(0.0, .16, vUv.x) * (1.0 - smoothstep(.84, 1.0, vUv.x));
          float lengthFade = smoothstep(0.0, .06, vUv.y) * pow(1.0 - vUv.y, 1.35);
          float mullion = .55 + .45 * smoothstep(.015, .07, abs(vUv.x - .5));
          float haze = .9 + .1 * sin(vUv.y * 13.0 + vUv.x * 5.0 + time * .08);
          gl_FragColor = vec4(tint, strength * edge * lengthFade * mullion * haze);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, depthTest: true,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    })
    return { geometry, material, slices }
  }, [mobile])
  useFrame(() => {
    resources.material.uniforms.strength.value = environment.directSun * .58 / resources.slices
    resources.material.uniforms.time.value = reducedMotion ? 0 : environment.cycleSeconds
    resources.material.uniforms.tint.value.copy(environment.sunColor)
  })
  useEffect(() => () => { resources.geometry.dispose(); resources.material.dispose() }, [resources])
  return <mesh geometry={resources.geometry} material={resources.material} renderOrder={2} raycast={() => {}} />
}

import * as THREE from 'three'
import layout, { point } from './loftLayout'

const normalizedName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
const replacedSourcePattern = /^(?:rearplasterwall|rearplasterlowerwall|rearplasterwindowheader|rearplasterwindowpier\d+|loftoakdeck(?:westpanel|northreturn|southreturn)?|oakstairlanding|loftrailing(?:upright|top|lower)|stairwellguardrail(?:upright|top|lower))\d*$/

function materialFrom(scene: THREE.Object3D, pattern: RegExp, fallback: THREE.Material): THREE.Material {
  let found: THREE.Material | undefined
  scene.traverse((object) => {
    if (found || !(object instanceof THREE.Mesh) || !pattern.test(normalizedName(object.name))) return
    found = Array.isArray(object.material) ? object.material[0] : object.material
  })
  return found ?? fallback
}

function addBox(parent: THREE.Group, name: string, position: [number, number, number], size: [number, number, number], material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.name = `loft shell fix / ${name}`
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addRail(parent: THREE.Group, name: string, start: [number, number, number], end: [number, number, number], radius: number, material: THREE.Material) {
  const a = new THREE.Vector3(...start)
  const b = new THREE.Vector3(...end)
  const direction = b.clone().sub(a)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material)
  mesh.name = `loft shell fix / ${name}`
  mesh.position.copy(a.add(b).multiplyScalar(0.5))
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addRearWall(group: THREE.Group, material: THREE.Material) {
  const xMin = -6.2
  const xMax = 6.2
  const centers = [-4.5, -2.75, -1.0]
  const openingWidth = 1.42
  const openingBottom = 3.34
  const openingTop = 5.9
  const zCenter = -4.62
  const wallDepth = 0.22

  addBox(group, 'rear plaster lower wall', [0, openingBottom / 2, zCenter],
    [xMax - xMin, openingBottom, wallDepth], material)
  addBox(group, 'rear plaster window header', [0, (openingTop + 6.3) / 2, zCenter],
    [xMax - xMin, 6.3 - openingTop, wallDepth], material)

  let cursor = xMin
  const spans: [number, number][] = []
  for (const center of centers) {
    const left = center - openingWidth / 2
    const right = center + openingWidth / 2
    if (left > cursor) spans.push([cursor, left])
    cursor = right
  }
  if (cursor < xMax) spans.push([cursor, xMax])

  spans.forEach(([left, right], index) => {
    addBox(group, `rear plaster window pier ${index + 1}`,
      [(left + right) / 2, (openingBottom + openingTop) / 2, zCenter],
      [right - left, openingTop - openingBottom, wallDepth], material)
  })
}

function addMezzanine(group: THREE.Group, oak: THREE.Material, steel: THREE.Material) {
  const deckY = 3.13
  const deckThickness = 0.26
  const deckXMin = -6.08
  const deckXMax = -1.6
  const deckZMin = -4.475
  const deckZMax = 3.175
  const openingXMin = -4.9
  const openingZMin = -2.65
  const openingZMax = 2.25

  addBox(group, 'loft oak deck west panel', [(deckXMin + openingXMin) / 2, deckY, -0.65],
    [openingXMin - deckXMin, deckThickness, deckZMax - deckZMin], oak)
  addBox(group, 'loft oak deck north return', [(openingXMin + deckXMax) / 2, deckY,
    (deckZMin + openingZMin) / 2], [deckXMax - openingXMin, deckThickness, openingZMin - deckZMin], oak)
  addBox(group, 'loft oak deck south return', [(openingXMin + deckXMax) / 2, deckY,
    (openingZMax + deckZMax) / 2], [deckXMax - openingXMin, deckThickness, deckZMax - openingZMax], oak)

  // The top tread ends at z=-2.48 and meets this landing edge-to-edge at y=3.26.
  addBox(group, 'oak stair landing', [-1.01, 3.13, -2.94], [1.18, 0.26, 0.92], oak)

  const railX = -1.58
  const edgeDepths = [-4.12, -3.25, 2.84]
  for (const depth of edgeDepths) {
    addRail(group, 'loft railing upright', [railX, 3.24, depth], [railX, 4.18, depth], 0.027, steel)
  }
  for (const [lowZ, highZ] of [[-4.25, openingZMin], [openingZMax, 3.02]]) {
    addRail(group, 'loft railing top', [railX, 4.18, lowZ], [railX, 4.18, highZ], 0.045, steel)
    addRail(group, 'loft railing lower', [railX, 3.57, lowZ], [railX, 3.57, highZ], 0.025, steel)
  }

  const guardY = 3.26
  const guardX = openingXMin - 0.2
  for (const depth of [-2.55, -1.75, -0.95, -0.15, 0.65, 1.45, 2.05]) {
    addRail(group, 'stairwell guardrail upright', [guardX, guardY, depth], [guardX, guardY + 0.9, depth], 0.026, steel)
  }
  addRail(group, 'stairwell guardrail top', [guardX, guardY + 0.9, openingZMin], [guardX, guardY + 0.9, openingZMax], 0.043, steel)
  addRail(group, 'stairwell guardrail lower', [guardX, guardY + 0.31, openingZMin], [guardX, guardY + 0.31, openingZMax], 0.023, steel)
}

function addClearWindowPanes(group: THREE.Group) {
  const glass = new THREE.MeshStandardMaterial({ color: '#c7dce0', roughness: 0.12, metalness: .12,
    transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide })
  for (const x of [-4.5, -2.75, -1.0]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 2.35), glass)
    pane.name = 'loft shell fix / clear window pane'
    pane.position.set(x, 4.62, -4.47)
    pane.renderOrder = 1
    pane.castShadow = false
    pane.receiveShadow = false
    group.add(pane)
  }
}

export function applyLoftShellFixes(scene: THREE.Object3D) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const name = normalizedName(object.name)
    if (/^(?:floatingstairtread|stairsiderail|ascendinghandrail|stairstringer)\d*$/.test(name) ||
      /^highwindowglass\d*$/.test(name)) {
      // Remove opaque panes and stale exported stairs before the first paint.
      object.visible = false
      object.userData.loftShellReplaced = true
    }
    if (replacedSourcePattern.test(name)) {
      object.visible = false
      object.userData.loftShellReplaced = true
    }
    if (/^mezzanineleg\d*$/.test(name) &&
      Math.abs(object.position.x + 2.78) < 0.12 && Math.abs(object.position.z + 1.05) < 0.12) {
      // Keep the old source support, but move it out of the new stairwell notch.
      object.position.set(-1.82, object.position.y, -3.15)
    }
  })

  const wallFallback = new THREE.MeshStandardMaterial({ color: '#b7a996', roughness: 0.9 })
  const deckFallback = new THREE.MeshStandardMaterial({ color: '#60412f', roughness: 0.72 })
  const steelFallback = new THREE.MeshStandardMaterial({ color: '#16191a', metalness: 0.72, roughness: 0.38 })
  const wall = materialFrom(scene, /^(?:rearplasterwall|rearplasterlowerwall|rearplasterwindowpier)/, wallFallback)
  const oak = materialFrom(scene, /^(?:loftoakdeck|floatingstairtread|personalshelf)/, deckFallback)
  const steel = materialFrom(scene, /^(?:loftrailing|stairsiderail|ascendinghandrail|stairwellguardrail)/, steelFallback)
  const group = new THREE.Group()
  group.name = 'loft shell runtime replacement'
  addRearWall(group, wall)
  addMezzanine(group, oak, steel)
  addClearWindowPanes(group)
  group.scale.set(...point(layout.shellScale))
  scene.add(group)
}

import * as THREE from 'three'
import portfolio from '../content/portfolio.json'

type Point3 = [number, number, number]

/** Coordinates stay aligned with the GLB's room space as the camera moves. */
export const contactDoorView = {
  hotspot: { position: [5.97, 1.55, -3.52] as Point3, size: [0.38, 3.18, 1.94] as Point3 },
  desktop: { position: [1.35, 2.1, -1] as Point3, target: [5.98, 1.72, -2.8] as Point3, fov: 42 },
  mobile: { position: [1.85, 2.35, -2.8] as Point3, target: [5.98, 1.28, -3.4] as Point3, fov: 59 },
}

const FIX_VERSION = 'door-poster-v1'
const DOOR_CENTER_Z = -3.4
const normalizedName = (name: string) => name.toLowerCase().replace(/[\s_.]+/g, ' ').trim()

function findMesh(root: THREE.Object3D, name: string): THREE.Mesh | undefined {
  const target = normalizedName(name)
  let result: THREE.Mesh | undefined
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const originalName = typeof object.userData.name === 'string' ? object.userData.name : object.name
    if (normalizedName(originalName) === target || normalizedName(object.name) === target) result = object
  })
  return result
}

function boundsInRoom(root: THREE.Object3D, mesh: THREE.Mesh) {
  root.updateWorldMatrix(true, true)
  mesh.geometry.computeBoundingBox()
  const transform = root.matrixWorld.clone().invert().multiply(mesh.matrixWorld)
  return mesh.geometry.boundingBox!.clone().applyMatrix4(transform)
}

function applyRoomTransform(root: THREE.Object3D, object: THREE.Object3D, transform: THREE.Matrix4) {
  root.updateWorldMatrix(true, true)
  const roomMatrix = root.matrixWorld.clone().invert().multiply(object.matrixWorld)
  const worldMatrix = root.matrixWorld.clone().multiply(transform).multiply(roomMatrix)
  const parentInverse = object.parent ? object.parent.matrixWorld.clone().invert() : new THREE.Matrix4()
  parentInverse.multiply(worldMatrix).decompose(object.position, object.quaternion, object.scale)
  object.updateMatrix()
  object.updateWorldMatrix(false, true)
}

function moveCenterX(root: THREE.Object3D, mesh: THREE.Mesh, x: number) {
  const center = boundsInRoom(root, mesh).getCenter(new THREE.Vector3())
  applyRoomTransform(root, mesh, new THREE.Matrix4().makeTranslation(x - center.x, 0, 0))
}

function makeHollowDoorFrame() {
  const casing = new THREE.Shape()
  casing.moveTo(-0.775, -1.565)
  casing.lineTo(0.775, -1.565)
  casing.lineTo(0.775, 1.565)
  casing.lineTo(-0.775, 1.565)
  casing.closePath()
  const opening = new THREE.Path()
  opening.moveTo(-0.685, -1.535)
  opening.lineTo(-0.685, 1.495)
  opening.lineTo(0.685, 1.495)
  opening.lineTo(0.685, -1.535)
  opening.closePath()
  casing.holes.push(opening)
  const geometry = new THREE.ExtrudeGeometry(casing, {
    depth: 0.14, steps: 1, bevelEnabled: true,
    bevelSegments: 2, bevelSize: 0.006, bevelThickness: 0.008,
  })
  geometry.translate(0, 0, -0.07)
  return geometry
}

function makeWallSectionGeometry(size: THREE.Vector3, center: THREE.Vector3, wallCenter: THREE.Vector3) {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
  const positions = geometry.attributes.position
  const normals = geometry.attributes.normal
  const uv = geometry.attributes.uv
  // Match build_loft.py's meter-based planar mapping, including glTF's V flip.
  // Coordinates stay relative to the original wall so the three sections join
  // without changing the plaster texture's scale or phase.
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index) + center.x - wallCenter.x
    const y = positions.getY(index) + center.y - wallCenter.y
    const z = positions.getZ(index) + center.z - wallCenter.z
    if (Math.abs(normals.getX(index)) > 0.5) uv.setXY(index, -z, 1 - y)
    else if (Math.abs(normals.getY(index)) > 0.5) uv.setXY(index, -z, 1 - x)
    else uv.setXY(index, y, 1 - x)
  }
  uv.needsUpdate = true
  return geometry
}

function rebuildWallAroundDoor(root: THREE.Object3D, wall: THREE.Mesh, wallBounds: THREE.Box3) {
  const openingRearZ = DOOR_CENTER_Z - 0.775
  const openingFrontZ = DOOR_CENTER_Z + 0.775
  const openingTop = wallBounds.min.y + 3.12
  const wallCenter = wallBounds.getCenter(new THREE.Vector3())
  const wallSize = wallBounds.getSize(new THREE.Vector3())
  const sections: [string, THREE.Vector3, THREE.Vector3][] = [
    ['rear pier',
      new THREE.Vector3(wallSize.x, 3.12, openingRearZ - wallBounds.min.z),
      new THREE.Vector3(wallCenter.x, wallBounds.min.y + 1.56, (wallBounds.min.z + openingRearZ) / 2)],
    ['front pier',
      new THREE.Vector3(wallSize.x, 3.12, wallBounds.max.z - openingFrontZ),
      new THREE.Vector3(wallCenter.x, wallBounds.min.y + 1.56, (openingFrontZ + wallBounds.max.z) / 2)],
    ['upper section',
      new THREE.Vector3(wallSize.x, wallBounds.max.y - openingTop, wallSize.z),
      new THREE.Vector3(wallCenter.x, (openingTop + wallBounds.max.y) / 2, wallCenter.z)],
  ]
  const rebuilt = new THREE.Group()
  rebuilt.name = 'right_wall_door_opening'
  for (const [name, size, center] of sections) {
    const section = new THREE.Mesh(makeWallSectionGeometry(size, center, wallCenter), wall.material)
    section.name = `right_wall_${name.replaceAll(' ', '_')}`
    section.position.copy(center)
    section.castShadow = wall.castShadow
    section.receiveShadow = true
    rebuilt.add(section)
  }
  root.add(rebuilt)
  wall.visible = false
  // Model's focus-visibility pass must honor this flag rather than reveal the
  // original solid wall again after a camera destination changes.
  wall.userData.doorPosterHidden = true
}

function embedDoor(root: THREE.Object3D) {
  const frame = findMesh(root, 'contact door frame')
  const wall = findMesh(root, 'right plaster wall')
  if (!frame || !wall) return

  const sourceCenter = boundsInRoom(root, frame).getCenter(new THREE.Vector3())
  const wallBounds = boundsInRoom(root, wall)
  const wallFaceX = wallBounds.min.x
  const targetCenter = new THREE.Vector3(wallFaceX - 0.035, sourceCenter.y, DOOR_CENTER_Z)
  const transform = new THREE.Matrix4().makeTranslation(...targetCenter.toArray())
    .multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2))
    .multiply(new THREE.Matrix4().makeTranslation(-sourceCenter.x, -sourceCenter.y, -sourceCenter.z))

  // Each offset is measured inward from the right wall. The original frame is
  // a filled box; a real opening lets the unchanged oak leaf sit behind its lip.
  const parts: [string, number][] = [
    ['contact door frame', 0.035],
    ['contact oak door', 0.025],
    ['contact sign frame', 0.086],
    ['contact hello sign', 0.104],
    ['door handle', 0.13],
    ['intercom', 0.048],
    ['intercom light', 0.101],
  ]
  frame.geometry = makeHollowDoorFrame()
  for (const [name, depth] of parts) {
    const mesh = findMesh(root, name)
    if (!mesh) continue
    applyRoomTransform(root, mesh, transform)
    moveCenterX(root, mesh, wallFaceX - depth)
  }
  rebuildWallAroundDoor(root, wall, wallBounds)
}

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number) {
  const words = text.split(/\s+/)
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && context.measureText(candidate).width > width) {
      context.fillText(line, x, y)
      y += lineHeight
      line = word
    } else line = candidate
  }
  if (line) context.fillText(line, x, y)
  return y + lineHeight
}

function makeTimelineTexture(): THREE.CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1360
  const context = canvas.getContext('2d')
  if (!context) return undefined

  const mat = context.createLinearGradient(0, 0, 2048, 1360)
  mat.addColorStop(0, '#dcd7c9')
  mat.addColorStop(1, '#c9c4b8')
  context.fillStyle = mat
  context.fillRect(0, 0, 2048, 1360)
  context.strokeStyle = '#b4ae9f'
  context.lineWidth = 2
  context.strokeRect(38, 38, 1972, 1284)

  // A restrained name line and two mounted records replace the billboard title.
  context.fillStyle = '#333831'
  context.font = '46px Georgia, serif'
  context.fillText(portfolio.name, 116, 125)
  context.fillStyle = '#62675e'
  context.font = '24px Arial, sans-serif'
  wrapText(context, portfolio.education, 117, 169, 1800, 31)

  const entries = portfolio.experience
  const gap = 64
  const left = 116
  const width = (2048 - left * 2 - gap * (entries.length - 1)) / entries.length
  const top = 284
  const height = 944

  context.strokeStyle = '#a49373'
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(left + width / 2, 234)
  context.lineTo(2048 - left - width / 2, 234)
  context.stroke()

  entries.forEach((entry, index) => {
    const x = left + index * (width + gap)
    context.fillStyle = '#8c795c'
    context.beginPath()
    context.arc(x + width / 2, 234, 7, 0, Math.PI * 2)
    context.fill()
    context.save()
    context.shadowColor = 'rgba(48, 41, 30, 0.22)'
    context.shadowBlur = 20
    context.shadowOffsetX = 2
    context.shadowOffsetY = 9
    context.fillStyle = '#f6f2e8'
    context.fillRect(x, top, width, height)
    context.restore()
    context.strokeStyle = '#e0dacd'
    context.lineWidth = 2
    context.strokeRect(x + 1, top + 1, width - 2, height - 2)
    context.strokeStyle = '#c3b596'
    context.lineWidth = 3
    context.strokeRect(x + 22, top + 22, width - 44, height - 44)

    const padding = 62
    const textX = x + padding
    const textWidth = width - padding * 2
    context.fillStyle = '#817154'
    context.font = '26px monospace'
    context.fillText(entry.period.toUpperCase(), textX, top + 104)
    context.fillStyle = '#2d3935'
    context.font = '52px Georgia, serif'
    let y = wrapText(context, entry.company, textX, top + 214, textWidth, 62)
    context.fillStyle = '#56645c'
    context.font = 'bold 30px Arial, sans-serif'
    y = wrapText(context, entry.role, textX, y + 40, textWidth, 40)
    context.strokeStyle = '#c6bfaf'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(textX, y + 32)
    context.lineTo(textX + textWidth, y + 32)
    context.stroke()
    context.fillStyle = '#555c53'
    context.font = '29px Arial, sans-serif'
    wrapText(context, entry.summary, textX, y + 92, textWidth, 44)
    context.fillStyle = '#898773'
    context.font = 'italic 25px Georgia, serif'
    context.fillText(portfolio.name, textX, top + height - 76)
  })

  // Fine, deterministic paper grain; no external image or generated backdrop.
  let seed = 23
  for (let index = 0; index < 22000; index++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const x = seed % canvas.width
    seed = (seed * 1664525 + 1013904223) >>> 0
    const y = seed % canvas.height
    context.fillStyle = index % 2 ? 'rgba(80, 68, 46, 0.025)' : 'rgba(255, 255, 247, 0.08)'
    context.fillRect(x, y, 1, 1)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.name = 'Framed portfolio timeline'
  texture.flipY = false
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/** Apply once to scene.clone(true); shared GLTF source materials stay untouched. */
export function applyDoorPosterFixes(root: THREE.Object3D) {
  if (root.userData[FIX_VERSION]) return
  embedDoor(root)

  const artwork = findMesh(root, 'experience timeline artwork')
  const texture = artwork ? makeTimelineTexture() : undefined
  if (artwork && texture) {
    const replaceMap = (original: THREE.Material) => {
      if (!(original instanceof THREE.MeshStandardMaterial)) return original
      const material = original.clone()
      material.map = texture
      material.color.set('#ffffff')
      material.roughness = 0.88
      material.metalness = 0
      material.emissive.set('#000000')
      material.emissiveMap = null
      material.needsUpdate = true
      return material
    }
    artwork.material = Array.isArray(artwork.material) ? artwork.material.map(replaceMap) : replaceMap(artwork.material)
  }
  root.userData[FIX_VERSION] = true
}

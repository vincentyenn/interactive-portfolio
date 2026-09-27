import { Box3, Group, Quaternion, Vector3, type Object3D } from 'three'

type Point = [number, number, number]

export const ABOUT_SHELF_SOURCE: Point = [-4.72, 0, -2.67]
export const ABOUT_SHELF_ANCHOR: Point = [5.64, 0, -1.2]
export const ABOUT_SHELF_OFFSET: Point = [10.36, 0, 1.47]
export const ABOUT_SHELF_YAW = -Math.PI / 2
export const ABOUT_SHELF_TARGET: Point = [5.58, 1.5, -1.2]
export const ABOUT_SHELF_CAMERA: Point = [0.45, 2.05, -1.2]
export const ABOUT_SHELF_MOBILE_CAMERA: Point = [1, 2.7, -1.2]
export const ABOUT_SHELF_MOBILE_TARGET: Point = [5.58, 0.7, -1.2]
export const ABOUT_SHELF_HITBOX_POSITION: Point = [5.62, 1.5, -1.2]
export const ABOUT_SHELF_HITBOX_SIZE: Point = [0.85, 3.05, 2.3]

const shelfPrefixes = [
  'personalshelf', 'shelfsteel', 'shelfbook', 'shelfceramic',
  'shelfphoto', 'plant', 'americanfootball', 'pinboardaboveshelf', 'pinnedcard',
]

// GLTFLoader replaces spaces and punctuation in the Blender node names.
const key = (object: Object3D) => object.name.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Apply to the cloned, Y-up GLTF root. Materials and the cached source stay intact. */
export function applyChairShelfFixes(root: Object3D): void {
  if (root.userData.chairShelfFixesApplied) return
  root.updateMatrixWorld(true)

  let chair: Object3D | undefined
  const shelfNodes: Object3D[] = []
  root.traverse((object) => {
    const name = key(object)
    if (!chair && name.startsWith('modernarmchair01')) chair = object
    if (shelfPrefixes.some((prefix) => name.startsWith(prefix))) shelfNodes.push(object)
  })

  if (chair) {
    const bounds = new Box3().setFromObject(chair)
    const center = bounds.getCenter(new Vector3())
    center.y = bounds.min.y
    root.worldToLocal(center)
    const rotation = chair.getWorldQuaternion(new Quaternion())
      .premultiply(root.getWorldQuaternion(new Quaternion()).invert())
    const forward = new Vector3(0, 0, 1).applyQuaternion(rotation)
    const towardDesk = new Vector3(-1.72, 0, -2.11).sub(center)
    const pivot = new Group()
    pivot.name = 'chair-facing-computer'
    pivot.position.copy(center)
    root.add(pivot)
    pivot.updateMatrixWorld(true)
    pivot.attach(chair)
    // Aim rather than toggle: the current GLB already contains a half-turn.
    pivot.rotation.y = Math.atan2(towardDesk.x, towardDesk.z) - Math.atan2(forward.x, forward.z)
  }

  if (shelfNodes.length) {
    const shelf = new Group()
    shelf.name = 'about-shelf-position'
    shelf.position.set(...ABOUT_SHELF_SOURCE)
    root.add(shelf)
    root.updateMatrixWorld(true)
    const moving = new Set(shelfNodes)
    for (const object of shelfNodes) {
      let parent = object.parent
      while (parent && parent !== root && !moving.has(parent)) parent = parent.parent
      if (parent && moving.has(parent)) continue
      shelf.attach(object)
      if (key(object).startsWith('pinboardaboveshelf') || key(object).startsWith('pinnedcard')) {
        // Remount the wall art behind the shelf instead of carrying its old wall gap.
        object.position.x -= -4.05 - ABOUT_SHELF_SOURCE[0]
        object.position.z = -0.355 + object.position.z - (-3.92 - ABOUT_SHELF_SOURCE[2])
      }
    }
    shelf.position.set(...ABOUT_SHELF_ANCHOR)
    shelf.rotation.y = ABOUT_SHELF_YAW
  }

  root.userData.chairShelfFixesApplied = true
  root.updateMatrixWorld(true)
}

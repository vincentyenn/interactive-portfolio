import { Box3, Group, Quaternion, Vector3, type Object3D } from 'three'

import { computerPoint } from './loftLayout'

type Point = [number, number, number]

export const ABOUT_SHELF_TARGET: Point = [7.07, 2.04, 0.2]
export const ABOUT_SHELF_CAMERA: Point = [2.72, 2.95, 0.2]
export const ABOUT_SHELF_MOBILE_CAMERA: Point = [1.3, 3.25, 0.2]
export const ABOUT_SHELF_MOBILE_TARGET: Point = [7.07, 2.04, 0.2]
export const ABOUT_SHELF_HITBOX_POSITION: Point = [6.9, 2.04, 0.2]
export const ABOUT_SHELF_HITBOX_SIZE: Point = [0.7, 3.05, 4.55]

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
    const towardDesk = new Vector3(...computerPoint([-1.72, 0, -2.11])).sub(center)
    const pivot = new Group()
    pivot.name = 'chair-facing-computer'
    pivot.position.copy(center)
    root.add(pivot)
    pivot.updateMatrixWorld(true)
    pivot.attach(chair)
    // Aim rather than toggle: the current GLB already contains a half-turn.
    pivot.rotation.y = Math.atan2(towardDesk.x, towardDesk.z) - Math.atan2(forward.x, forward.z)
  }

  // The wall collection is rendered as one recessed unit. Remove the former
  // floating shelf and its props from this GLB clone so they cannot overlap it.
  const moving = new Set(shelfNodes)
  for (const object of shelfNodes) {
    let parent = object.parent
    while (parent && parent !== root && !moving.has(parent)) parent = parent.parent
    if (parent && moving.has(parent)) continue
    object.parent?.remove(object)
  }

  root.userData.chairShelfFixesApplied = true
  root.updateMatrixWorld(true)
}

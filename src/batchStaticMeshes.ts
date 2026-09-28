import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Merge static, non-interactive room parts without changing their vertices or maps.
 * Spatial buckets preserve useful frustum culling; material/attribute boundaries
 * prevent UVs, normal maps or shadow behavior from being mixed together.
 */
export function batchStaticMeshes(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  const inverse = root.matrixWorld.clone().invert()
  const groups = new Map<string, THREE.Mesh[]>()
  const center = new THREE.Vector3()
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.SkinnedMesh || object instanceof THREE.InstancedMesh ||
      object.children.length > 0 ||
      !object.visible || Array.isArray(object.material) || object.material.transparent ||
      Object.keys(object.geometry.morphAttributes).length || object.geometry.drawRange.count !== Infinity ||
      object.matrixWorld.determinant() < 0) return
    for (let parent = object.parent; parent && parent !== root; parent = parent.parent) if (!parent.visible) return
    object.geometry.computeBoundingBox()
    object.geometry.boundingBox!.getCenter(center).applyMatrix4(object.matrixWorld).applyMatrix4(inverse)
    const attributes = (Object.entries(object.geometry.attributes) as [string, THREE.BufferAttribute | THREE.InterleavedBufferAttribute][]).sort(([a], [b]) => a.localeCompare(b))
      .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized}:${(attribute instanceof THREE.InterleavedBufferAttribute ? attribute.data.array : attribute.array).constructor.name}`).join(',')
    const key = [object.material.uuid, object.castShadow, object.receiveShadow, Boolean(object.geometry.index), attributes,
      Math.floor(center.x / 4), Math.floor(center.y / 4), Math.floor(center.z / 4)].join('|')
    const bucket = groups.get(key) ?? []
    bucket.push(object); groups.set(key, bucket)
  })
  const owned: THREE.BufferGeometry[] = []
  for (const objects of groups.values()) {
    if (objects.length < 3) continue
    const geometries = objects.map((object) => object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld)))
    const geometry = mergeGeometries(geometries, false)
    geometries.forEach((part) => part.dispose())
    if (!geometry) continue
    geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    const batch = new THREE.Mesh(geometry, objects[0].material)
    batch.name = `static room batch / ${objects.length} parts`
    batch.castShadow = objects[0].castShadow
    batch.receiveShadow = objects[0].receiveShadow
    batch.raycast = () => {}
    root.add(batch)
    objects.forEach((object) => { object.visible = false })
    owned.push(geometry)
  }
  root.updateMatrixWorld(true)
  root.traverse((object) => { object.updateMatrix(); object.matrixAutoUpdate = false })
  return () => owned.forEach((geometry) => geometry.dispose())
}

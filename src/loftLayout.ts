import layout from '../content/loft-layout.json'

export type Point = [number, number, number]
export const point = (value: number[]): Point => [value[0], value[1], value[2]]
export const offsetPoint = (position: number[], offset: number[]): Point =>
  [position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]]
export const shellPoint = (position: number[]): Point =>
  [position[0] * layout.shellScale[0], position[1], position[2] * layout.shellScale[2]]
export const computerPoint = (position: number[]): Point => offsetPoint(position, layout.computerOffset)
export const benchScale = layout.workbenchScale
export const benchPoint = (position: number[]): Point => offsetPoint([
  2.28 + (position[0] - 2.28) * benchScale,
  position[1],
  1.04 + (position[2] - 1.04) * benchScale,
], layout.workbenchOffset)
export const experiencePoint = (position: number[]): Point => offsetPoint(position, layout.experienceOffset)
// Keep the overhead view below the roof and pendant hardware. The paper lift
// and focus pass share these values so their framing stays in sync.
export const projectView = {
  cameraHeight: 4.85,
  fov: 58,
  mobileFov: 108,
  paperHeight: 2.4,
  mobilePaperHeight: 2.7,
}
export default layout

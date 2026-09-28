import portfolio from '../content/portfolio.json'
import { experiencePoint, type Point } from './loftLayout'

export type ArtifactId = 'usaa' | 'utd' | 'education' | 'camcorder' | 'headphones' | 'football' | 'cookbook' | 'portrait'
export type Artifact = {
  id: ArtifactId, section: 'experience' | 'about', title: string, kicker: string,
  body: string, notes: string[], position: Point, width: number, height: number,
}
const shelfPoint = (x: number, y: number, z = .25): Point => [7.42 - z, y, .2 + x]
export const roomArtifacts: Artifact[] = [
  { id: 'usaa', section: 'experience', title: 'USAA', kicker: portfolio.experience[0].period,
    body: portfolio.experience[0].summary, notes: [portfolio.experience[0].role, 'React / TypeScript / Java / Spring Boot'],
    position: experiencePoint([1.6, 2.65, -4.43]), width: .86, height: 1.35 },
  { id: 'utd', section: 'experience', title: 'Accessible language', kicker: 'UT DALLAS / RESEARCH',
    body: portfolio.experience[1].summary, notes: [portfolio.experience[1].role, portfolio.experience[1].period, 'Text simplification / Machine learning'],
    position: experiencePoint([2.95, 2.69, -4.43]), width: 1.38, height: 1.53 },
  { id: 'education', section: 'experience', title: 'Texas A&M', kicker: 'EDUCATION',
    body: portfolio.education, notes: ['Computer science', 'Cybersecurity minor'],
    position: experiencePoint([4.35, 2.83, -4.43]), width: 1.04, height: .9 },
  { id: 'camcorder', section: 'about', title: 'Behind the camera', kicker: 'FIELD NOTES / VIDEO',
    body: 'I capture Aggie football through videography and enjoy telling stories behind the camera.', notes: ['Aggie football / Storytelling'],
    position: shelfPoint(-.5, 1.76, .45), width: .7, height: .48 },
  { id: 'headphones', section: 'about', title: 'Music, off the clock', kicker: 'LISTENING NOTES',
    body: 'Music keeps me curious outside the screen.', notes: ['A little space away from code.'],
    position: shelfPoint(.52, 1.79, .24), width: .7, height: .58 },
  { id: 'football', section: 'about', title: 'Aggie football', kicker: 'ON THE SIDELINES',
    body: 'Sports and storytelling come together in my Aggie football videography.', notes: ['Texas A&M / Videography'],
    position: shelfPoint(-.5, .91, .3), width: .72, height: .52 },
  { id: 'cookbook', section: 'about', title: 'Kitchen notes', kicker: 'AWAY FROM THE SCREEN',
    body: 'Cooking is one of the things that keeps me curious outside computer science.', notes: ['Cooking / Curiosity'],
    position: shelfPoint(.52, .94, .27), width: .7, height: .54 },
  { id: 'portrait', section: 'about', title: portfolio.name, kicker: 'A LITTLE ABOUT ME',
    body: portfolio.about, notes: [portfolio.education],
    position: shelfPoint(-.43, 2.66, .14), width: .78, height: .64 },
]
export const artifactById = (id: string | null) => roomArtifacts.find((item) => item.id === id)
export function artifactView(id: string, aspect: number) {
  const item = artifactById(id)!
  const target = [...item.position] as Point
  if (id === 'camcorder') target[2] += .15
  if (id === 'football' || id === 'headphones') { target[1] -= .12; target[0] -= .2 }
  const width = id === 'camcorder' ? 1.08 : item.width
  const height = id === 'camcorder' ? .6 : item.height
  const distance = Math.max(height / .68, width / (aspect * .78)) / (2 * Math.tan(22 * Math.PI / 180))
  return { position: item.section === 'about' ? [target[0] - distance, target[1], target[2]] as Point
    : [target[0], target[1], target[2] + distance] as Point, target, fov: 44 }
}

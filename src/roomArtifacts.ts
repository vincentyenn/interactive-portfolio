import portfolio from '../content/portfolio.json'
import { experiencePoint, type Point } from './loftLayout'

export type ArtifactId = 'usaa' | 'utd' | 'education' | 'about-me'
export type Artifact = {
  id: ArtifactId, section: 'experience' | 'about', title: string, kicker: string,
  body: string, notes: string[], position: Point, width: number, height: number,
}
export const shelfPoint = (x: number, y: number, z = .25): Point => [7.42 - z, y, .2 + x]
export const roomArtifacts: Artifact[] = [
  { id: 'usaa', section: 'experience', title: 'USAA', kicker: portfolio.experience[0].period,
    body: portfolio.experience[0].summary,
    notes: [portfolio.experience[0].role, portfolio.experience[0].location, ...portfolio.experience[0].highlights, `Tools: ${portfolio.experience[0].tools.join(' / ')}`],
    position: experiencePoint([1.6, 2.65, -4.43]), width: .86, height: 1.35 },
  { id: 'utd', section: 'experience', title: 'Accessible language', kicker: 'UT DALLAS / RESEARCH',
    body: portfolio.experience[1].summary,
    notes: [portfolio.experience[1].role, portfolio.experience[1].period, portfolio.experience[1].location, ...portfolio.experience[1].highlights,
      `Tools: ${portfolio.experience[1].tools.join(' / ')}`],
    position: experiencePoint([2.95, 2.69, -4.43]), width: 1.38, height: 1.53 },
  { id: 'education', section: 'experience', title: 'Texas A&M', kicker: 'EDUCATION',
    body: portfolio.education, notes: ['Computer science', 'Cybersecurity minor'],
    position: experiencePoint([4.35, 2.83, -4.43]), width: 1.04, height: .9 },
  { id: 'about-me', section: 'about', title: 'About me', kicker: 'VINCENT YEN / PERSONAL',
    body: portfolio.about, notes: [],
    position: shelfPoint(0, 3.14, .14), width: 1.14, height: 1.65 },
]
export const artifactById = (id: string | null) => roomArtifacts.find((item) => item.id === id)
export function artifactView(id: string, aspect: number) {
  const item = artifactById(id)!
  const target = [...item.position] as Point
  const width = item.width
  const height = item.height
  const distance = Math.max(height / .68, width / (aspect * .78)) / (2 * Math.tan(22 * Math.PI / 180))
  return { position: item.section === 'about' ? [target[0] - distance, target[1], target[2]] as Point
    : [target[0], target[1], target[2] + distance] as Point, target, fov: 44 }
}

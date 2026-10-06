import portfolio from '../content/portfolio.json'
import { experiencePoint, type Point } from './loftLayout'

export type ArtifactId = 'usaa' | 'utd' | 'education'
export type Artifact = {
  id: ArtifactId, section: 'experience', title: string, kicker: string,
  body: string, notes: string[], position: Point, width: number, height: number,
}
export type AboutObject = {
  id: 'portrait' | 'camera' | 'sports' | 'cooking'
  section: 'about'
  title: string
  kicker: string
  bay: [column: number, row: 0 | 1]
  facts: { label: string, value: string }[]
  body: string
  photos?: typeof portfolio.aboutPhotos
}

export const aboutObjects: AboutObject[] = [
  {
    id: 'portrait', section: 'about', title: 'Vincent Yen', kicker: '01 / ABOUT ME', bay: [0, 0],
    facts: [
      { label: 'Studying', value: 'Computer science at Texas A&M' },
      { label: 'Minor', value: 'Cybersecurity' },
      { label: 'Drawn to', value: 'Software that makes complex work easier' },
    ],
    body: portfolio.about,
    photos: portfolio.aboutPhotos,
  },
  {
    id: 'camera', section: 'about', title: 'Behind the lens', kicker: '02 / PHOTO + VIDEO', bay: [1, 1],
    facts: [
      { label: 'On the shelf', value: 'Sony camera' },
      { label: 'Interest', value: 'Photography and videography' },
      { label: 'A favorite subject', value: 'Aggie football' },
    ],
    body: 'I enjoy making photographs and videos, especially around sports. Filming Aggie football gives me a way to notice the small moments around a bigger game and tell that story through a camera.',
    photos: portfolio.aboutPhotos.filter((photo) => photo.src.includes('videography')),
  },
  {
    id: 'sports', section: 'about', title: 'In the game', kicker: '03 / SPORTS', bay: [2, 0],
    facts: [
      { label: 'Off the clock', value: 'Playing sports' },
      { label: 'Following', value: 'Aggie football' },
    ],
    body: 'I love playing sports and following them with friends. They keep me active, give me a chance to compete, and bring people together away from a screen.',
  },
  {
    id: 'cooking', section: 'about', title: 'In the kitchen', kicker: '04 / COOKING', bay: [3, 1],
    facts: [
      { label: 'Off the clock', value: 'Cooking' },
      { label: 'What I enjoy', value: 'Making something by hand' },
    ],
    body: 'I love cooking. It gives me a hands-on creative break from code and a good reason to spend time with the people around me.',
  },
]

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
]
export const artifactById = (id: string | null) =>
  roomArtifacts.find((item) => item.id === id) ?? aboutObjects.find((item) => item.id === (id === 'about-me' ? 'portrait' : id))
export function artifactView(id: string, aspect: number) {
  const item = roomArtifacts.find((entry) => entry.id === id)!
  const target = [...item.position] as Point
  const width = item.width
  const height = item.height
  const distance = Math.max(height / .68, width / (aspect * .78)) / (2 * Math.tan(22 * Math.PI / 180))
  return { position: [target[0], target[1], target[2] + distance] as Point, target, fov: 44 }
}

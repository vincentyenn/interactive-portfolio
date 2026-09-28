export type MusicTrack = { title: string, artist: string, file: string }

// Local preview files are intentionally kept out of the public build. Add only music
// with distribution rights to a public playlist in a future pass.
export const musicTracks: MusicTrack[] = import.meta.env.DEV ? [
  { title: 'Forever Be Mine (Instrumental)', artist: 'Gunna feat. Wizkid', file: 'forever-be-mine.mp3' },
  { title: 'What They Do (Instrumental)', artist: 'MexikoDro', file: 'what-they-do.mp3' },
  { title: 'IDGAF (Intro)', artist: 'Drake', file: 'idgaf-intro.mp3' },
  { title: 'Still Sleepless', artist: 'D.O.D feat. Carla Monroe', file: 'still-sleepless.mp3' },
  { title: 'Thx (Clean)', artist: 'Ken Carson', file: 'thx.mp3' },
].map((track) => ({ ...track, file: `/__local-music__/${track.file}` })) : []

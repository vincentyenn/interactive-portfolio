import { useCallback, useEffect, useRef, useState } from 'react'
import { musicTracks } from './musicTracks'

export function useMusicPlayer() {
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const trackIndex = useRef(0)

  const playAt = useCallback(async (nextIndex: number) => {
    const player = audio.current
    if (!player || !musicTracks.length) return
    const safeIndex = (nextIndex + musicTracks.length) % musicTracks.length
    trackIndex.current = safeIndex
    setIndex(safeIndex)
    player.src = musicTracks[safeIndex].file
    player.load()
    try {
      await player.play()
      setPlaying(true)
      setError('')
    } catch {
      setPlaying(false)
      setError('Could not play this track. Try the speaker again.')
    }
  }, [])

  const toggle = useCallback(async () => {
    const player = audio.current
    if (!player || !musicTracks.length) {
      setError('Local music preview is available in the development site.')
      return
    }
    if (!player.paused) {
      player.pause()
      return
    }
    if (!player.src || player.ended) {
      await playAt(trackIndex.current)
      return
    }
    try {
      await player.play()
      setPlaying(true)
      setError('')
    } catch {
      setError('Could not play this track. Try the speaker again.')
    }
  }, [playAt])

  const next = useCallback(() => { void playAt(trackIndex.current + 1) }, [playAt])
  const previous = useCallback(() => { void playAt(trackIndex.current - 1) }, [playAt])

  useEffect(() => {
    if (!musicTracks.length) return
    const player = new Audio()
    player.preload = 'metadata'
    player.volume = 0.28
    audio.current = player
    const pause = () => {
      setPlaying(false)
    }
    const ended = () => { void playAt(trackIndex.current + 1) }
    const failed = () => {
      setPlaying(false)
      setError('Track could not be loaded. Check the local music preview files.')
    }
    player.addEventListener('pause', pause)
    player.addEventListener('ended', ended)
    player.addEventListener('error', failed)
    const stopWhenHidden = () => { if (document.hidden) player.pause() }
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden)
      player.removeEventListener('pause', pause)
      player.removeEventListener('ended', ended)
      player.removeEventListener('error', failed)
      player.pause()
      player.removeAttribute('src')
      player.load()
      audio.current = null
    }
  }, [playAt])

  const currentTrack = musicTracks[index] ?? null
  return { playing, error, index, currentTrack, trackCount: musicTracks.length, toggle, next, previous }
}

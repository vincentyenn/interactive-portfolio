import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, statSync } from 'node:fs'
import { resolve } from 'node:path'

const localTracks: Record<string, string> = {
  'forever-be-mine.mp3': 'forever-be-mine.mp3',
  'what-they-do.mp3': 'what-they-do.mp3',
  'idgaf-intro.mp3': 'idgaf-intro.mp3',
  'still-sleepless.mp3': 'still-sleepless.mp3',
  'thx.mp3': 'thx.mp3',
}

function localMusicPreview() {
  return {
    name: 'local-music-preview',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/__local-music__', (request, response, next) => {
        const fileName = decodeURIComponent((request.url ?? '').split('?')[0].replace(/^\/+/, ''))
        const file = localTracks[fileName]
        if (!file) { next(); return }
        const path = resolve(process.cwd(), '.local-media/music', file)
        let size: number
        try { size = statSync(path).size } catch { response.statusCode = 404; response.end(); return }
        response.setHeader('Content-Type', 'audio/mpeg')
        response.setHeader('Accept-Ranges', 'bytes')
        let start = 0
        let end = size - 1
        const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/)
        if (range && (range[1] || range[2])) {
          if (!range[1]) start = Math.max(0, size - Number(range[2]))
          else start = Number(range[1])
          end = range[2] && range[1] ? Math.min(Number(range[2]), end) : end
          if (start > end || start >= size) {
            response.statusCode = 416
            response.setHeader('Content-Range', `bytes */${size}`)
            response.end()
            return
          }
          response.statusCode = 206
          response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
        }
        response.setHeader('Content-Length', end - start + 1)
        if (request.method === 'HEAD') { response.end(); return }
        createReadStream(path, { start, end }).on('error', () => response.destroy()).pipe(response)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localMusicPreview()],
  base: '/interactive-portfolio/',
})

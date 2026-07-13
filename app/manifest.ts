import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MemorAI',
    short_name: 'MemorAI',
    description: 'Sua memória, potencializada — grave aulas e organize seus estudos automaticamente',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f0e8',
    theme_color: '#d9622b',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
import type { MetadataRoute } from 'next';

// PWA manifest — dáva pripnutej „appke" na ploche telefónu poriadnu CL ikonku
// (zelený diamant) namiesto rozmazaného favicony. start_url = postovacia fronta,
// takže ťuk na ikonku otvorí rovno stránku na postovanie.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Curiosity Lab',
    short_name: 'Curiosity Lab',
    start_url: '/tiktok-k7x9m',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#c5f53a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

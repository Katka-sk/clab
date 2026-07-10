import VideoQueue from './VideoQueue';
import { VIDEOS } from './videos';

// Postovacia fronta VIDEÍ (júl 2026). Ťuk na pripnutú ikonku → táto stránka →
// uložiť do galérie + Done → natiahne ďalšie. Carousel verzia (Sanity →
// TikTokClient.tsx) je zachovaná v repozitári; vrátime ju, keď od augusta
// prejdeme na carousely.
export const metadata = { title: 'Curiosity Lab · Postovacia fronta' };

export default function TikTokPage() {
  return <VideoQueue videos={VIDEOS} />;
}

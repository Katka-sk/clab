import type { Metadata } from 'next';
import Fronta from './Fronta';
import { KUSY } from './kusy';

// Postovacia fronta pre Mindborn TikTok (október 2026). Skrytá stránka, nikde neprelinkovaná.
// Dáta = kusy.ts (generuje Mindborn/podklady/video/tiktok/fronta_export.py), súbory v public/mb/.
export const metadata: Metadata = {
  title: 'Mindborn · TikTok fronta',
  robots: { index: false, follow: false },
};

export default function FrontaPage() {
  return <Fronta kusy={KUSY} />;
}

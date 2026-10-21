// Matkov jedálniček — súkromná stránka, nikde neprelinkovaná a neindexovaná.
// Obsah je hotové HTML s vlastným <style> a <script> (page.html), preto route
// handler a nie page.tsx — dangerouslySetInnerHTML by skripty nespustilo.
// Zdroj obsahu a úpravy: ~/Desktop/Matko zdravie/ (PLAN-JEDLO.md, ZUBY-STRAVA-VYVOJ.md).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// force-static => GET sa vyhodnotí pri builde, kde page.html určite existuje
export const dynamic = 'force-static';

const HTML = readFileSync(join(process.cwd(), 'app', 'matko', 'page.html'), 'utf-8');

export async function GET() {
  return new Response(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}

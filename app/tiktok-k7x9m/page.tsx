import { createClient } from '@sanity/client';
import TikTokClient from './TikTokClient';

const sanity = createClient({
  projectId: '74b6xpqc',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

export const revalidate = 60;

export default async function TikTokPage() {
  const pikoska = await sanity.fetch(
    `*[_type == "pikoska" && publikovaneSocial == true && defined(tiktokSlides)] | order(datumPublikacie desc)[0]{
      nadpis, datumPublikacie, tiktokSlides, socialCaption
    }`
  );

  if (!pikoska) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif', backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>Žiadny carousel zatiaľ.</div>;
  }

  const datum = pikoska.datumPublikacie
    ? new Date(pikoska.datumPublikacie).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <TikTokClient
      nadpis={pikoska.nadpis}
      datum={datum}
      slides={pikoska.tiktokSlides || []}
      caption={pikoska.socialCaption || ''}
    />
  );
}

import { createClient } from '@sanity/client';

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
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Žiadny carousel zatiaľ.</div>;
  }

  const datum = pikoska.datumPublikacie
    ? new Date(pikoska.datumPublikacie).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <p style={{ color: '#c8f135', fontSize: 13, marginBottom: 4, letterSpacing: 2, textTransform: 'uppercase' }}>Curiosity Lab · TikTok</p>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{pikoska.nadpis}</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>{datum}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {(pikoska.tiktokSlides || []).map((url: string, i: number) => (
          <a
            key={i}
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              backgroundColor: '#1a1a1a',
              borderRadius: 12,
              overflow: 'hidden',
              textDecoration: 'none',
            }}
          >
            <img src={url} alt={`Slide ${i + 1}`} style={{ width: '100%', display: 'block' }} />
            <div style={{ padding: '10px 14px', color: '#c8f135', fontSize: 13, fontWeight: 700 }}>
              ↓ Stiahnuť slide {i + 1}
            </div>
          </a>
        ))}
      </div>

      {pikoska.socialCaption && (
        <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16 }}>
          <p style={{ color: '#888', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Caption</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{pikoska.socialCaption}</p>
        </div>
      )}
    </div>
  );
}

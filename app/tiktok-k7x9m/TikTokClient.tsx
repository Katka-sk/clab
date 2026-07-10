'use client';

import { useState } from 'react';

export default function TikTokClient({
  nadpis,
  datum,
  slides,
  caption,
}: {
  nadpis: string;
  datum: string;
  slides: string[];
  caption: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [stav, setStav] = useState('');

  // Stiahne všetky slidy ako File[] (cez proxy — obchádza CORS).
  async function nacitajSubory(): Promise<File[]> {
    return Promise.all(
      slides.map(async (url, i) => {
        const res = await fetch(`/api/tiktok-download?url=${encodeURIComponent(url)}`);
        const blob = await res.blob();
        return new File([blob], `curiositylab-slide-${i + 1}.png`, {
          type: blob.type || 'image/png',
        });
      })
    );
  }

  function stiahniSubor(file: File) {
    const objUrl = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
  }

  // MOBIL: systémové zdieľanie so súbormi → „Uložiť do galérie" alebo rovno do TikToku,
  // všetky naraz. Sekvenčné a.click() mobil blokuje (stiahol len 1). DESKTOP: fallback.
  async function ulozitVsetko() {
    setDownloading(true);
    setStav('Pripravujem obrázky…');
    try {
      const files = await nacitajSubory();
      const nav = navigator as unknown as {
        canShare?: (d: { files: File[] }) => boolean;
        share?: (d: { files: File[]; title?: string }) => Promise<void>;
      };
      if (nav.canShare && nav.share && nav.canShare({ files })) {
        setStav('');
        await nav.share({ files, title: nadpis });
      } else {
        setStav('Sťahujem…');
        for (const f of files) {
          stiahniSubor(f);
          await new Promise((r) => setTimeout(r, 500));
        }
        setStav('');
      }
    } catch {
      // používateľ zrušil systémové menu = v poriadku
      setStav('');
    }
    setDownloading(false);
  }

  function copyCaption() {
    navigator.clipboard.writeText(caption).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const btn: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '16px',
    borderRadius: 12,
    border: 'none',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'center',
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <p style={{ color: '#c8f135', fontSize: 13, marginBottom: 4, letterSpacing: 2, textTransform: 'uppercase' }}>Curiosity Lab · TikTok</p>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{nadpis}</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>{datum}</p>

      {/* Náhľady */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {slides.map((url, i) => (
          <div key={i} style={{ backgroundColor: '#1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
            <img src={url} alt={`Slide ${i + 1}`} style={{ width: '100%', display: 'block' }} />
          </div>
        ))}
      </div>

      {/* Uložiť všetko do galérie / zdieľať */}
      <button onClick={ulozitVsetko} disabled={downloading} style={{ ...btn, backgroundColor: '#c8f135', color: '#000', marginBottom: 8 }}>
        {downloading ? (stav || 'Pracujem…') : `⤓ Uložiť všetkých ${slides.length} do galérie`}
      </button>
      <p style={{ color: '#888', fontSize: 12, textAlign: 'center', margin: '0 0 16px' }}>
        Otvorí sa systémové menu → <b style={{ color: '#c8f135' }}>Uložiť do galérie</b> (alebo rovno zdieľať do TikToku).
      </p>

      {/* Caption */}
      {caption && (
        <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <p style={{ color: '#888', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Caption</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 12px 0' }}>{caption}</p>
          <button onClick={copyCaption} style={{ ...btn, backgroundColor: copied ? '#1a3a00' : '#2a2a2a', color: copied ? '#c8f135' : '#fff', fontSize: 14, padding: '12px' }}>
            {copied ? '✓ Skopírované' : 'Kopírovať caption'}
          </button>
        </div>
      )}
    </div>
  );
}

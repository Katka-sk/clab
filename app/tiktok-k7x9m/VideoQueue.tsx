'use client';

import { useEffect, useState } from 'react';
import type { ClabVideo } from './videos';

const KEY = 'clab-video-done-v1';

export default function VideoQueue({ videos }: { videos: ClabVideo[] }) {
  const [done, setDone] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  function persist(next: string[]) {
    setDone(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const remaining = videos.filter((v) => !done.includes(v.id));
  const current = remaining[0];
  const hotove = videos.length - remaining.length;
  const fullCaption = current ? `${current.caption}\n\n${current.hashtags}` : '';

  // Uloží video do galérie cez systémové zdieľanie (mobil), inak stiahne (desktop).
  async function ulozit() {
    if (!current) return;
    setBusy(true);
    try {
      const res = await fetch(current.src);
      const blob = await res.blob();
      const file = new File([blob], `${current.id}.mp4`, { type: 'video/mp4' });
      const nav = navigator as unknown as {
        canShare?: (d: { files: File[] }) => boolean;
        share?: (d: { files: File[]; title?: string }) => Promise<void>;
      };
      if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: current.nadpis });
      } else {
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(u), 1000);
      }
    } catch {
      /* zrušené = ok */
    }
    setBusy(false);
  }

  function kopiruj() {
    navigator.clipboard.writeText(fullCaption).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function hotovo() {
    if (!current) return;
    persist([...done, current.id]);
    setCopied(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const wrap: React.CSSProperties = {
    maxWidth: 480,
    margin: '0 auto',
    padding: '20px 16px 48px',
    fontFamily: 'sans-serif',
    backgroundColor: '#0a0a0a',
    minHeight: '100vh',
    color: '#fff',
  };
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

  if (!loaded) return <div style={wrap} />;

  // Všetko hotové
  if (!current) {
    return (
      <div style={{ ...wrap, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Všetkých {videos.length} hotových!</h1>
        <p style={{ color: '#888', marginBottom: 28 }}>Pekná práca. Zajtra ďalšie.</p>
        <button onClick={() => persist([])} style={{ ...btn, backgroundColor: '#1a1a1a', color: '#c8f135' }}>
          ↺ Začať fronty odznova
        </button>
      </div>
    );
  }

  return (
    <div style={wrap}>
      {/* Hlavička + progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <p style={{ color: '#c8f135', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
          Curiosity Lab · Fronta
        </p>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
          <b style={{ color: '#c8f135' }}>{hotove}</b> / {videos.length} hotové
        </p>
      </div>
      {/* progress bar */}
      <div style={{ height: 6, background: '#1a1a1a', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${(hotove / videos.length) * 100}%`, background: '#c8f135', transition: 'width .3s' }} />
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>{current.nadpis}</h1>

      {/* Video */}
      <video
        key={current.id}
        src={current.src}
        controls
        playsInline
        preload="metadata"
        style={{ width: '100%', borderRadius: 14, backgroundColor: '#000', display: 'block', marginBottom: 16, maxHeight: '62vh' }}
      />

      {/* 1. Uložiť do galérie */}
      <button onClick={ulozit} disabled={busy} style={{ ...btn, backgroundColor: '#c8f135', color: '#000', marginBottom: 8 }}>
        {busy ? 'Pripravujem…' : '⤓ Uložiť video do galérie'}
      </button>
      <p style={{ color: '#888', fontSize: 12, textAlign: 'center', margin: '0 0 16px' }}>
        Otvorí sa menu → <b style={{ color: '#c8f135' }}>Uložiť do galérie</b> (alebo rovno do TikToku).
      </p>

      {/* 2. Caption */}
      <div style={{ backgroundColor: '#141414', borderRadius: 12, padding: 16, marginBottom: 8 }}>
        <p style={{ color: '#888', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Caption</p>
        <p style={{ fontSize: 15, lineHeight: 1.5, margin: '0 0 6px' }}>{current.caption}</p>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: '#8ab4ff', margin: '0 0 12px' }}>{current.hashtags}</p>
        <button onClick={kopiruj} style={{ ...btn, backgroundColor: copied ? '#1a3a00' : '#2a2a2a', color: copied ? '#c8f135' : '#fff', fontSize: 14, padding: 12 }}>
          {copied ? '✓ Skopírované' : 'Kopírovať caption + hashtagy'}
        </button>
      </div>

      {/* 3. Done → ďalšie */}
      <button onClick={hotovo} style={{ ...btn, backgroundColor: '#183a18', color: '#c8f135', border: '1px solid #2f6b2f', marginTop: 12 }}>
        ✅ Hotovo — natiahni ďalšie video
      </button>
      <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
        Zostáva {remaining.length}. „Hotovo" ťukni až po postnutí na TikTok.
      </p>
    </div>
  );
}

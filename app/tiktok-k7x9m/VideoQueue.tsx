'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ClabVideo } from './videos';

// Stav sa drží v telefóne (localStorage) — poradie aj vyhodenie si prehadzuješ
// kedykoľvek bez toho, aby sa appka musela znova nasadzovať.
const DONE_KEY = 'clab-video-done-v1'; // hotové (postnuté) — zmiznú z fronty
const ORDER_KEY = 'clab-video-order-v1'; // vlastné poradie (pole id)
const SKIP_KEY = 'clab-video-skip-v1'; // vyhodené — skryté, dajú sa vrátiť

function nacitaj(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default function VideoQueue({ videos }: { videos: ClabVideo[] }) {
  const [done, setDone] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [skip, setSkip] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ukazVyhodene, setUkazVyhodene] = useState(false);

  useEffect(() => {
    setDone(nacitaj(DONE_KEY));
    setOrder(nacitaj(ORDER_KEY));
    setSkip(nacitaj(SKIP_KEY));
    setLoaded(true);
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, ClabVideo>();
    videos.forEach((v) => m.set(v.id, v));
    return m;
  }, [videos]);

  // Efektívne poradie: uložené id (čo ešte existujú) + nové videá z videos.ts na koniec.
  const poradie = useMemo(() => {
    const zname = order.filter((id) => byId.has(id));
    const nove = videos.map((v) => v.id).filter((id) => !zname.includes(id));
    return [...zname, ...nove];
  }, [order, videos, byId]);

  // Persist helpers ------------------------------------------------------------
  function ulozDone(next: string[]) {
    setDone(next);
    try { localStorage.setItem(DONE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
  function ulozOrder(next: string[]) {
    setOrder(next);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
  function ulozSkip(next: string[]) {
    setSkip(next);
    try { localStorage.setItem(SKIP_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  // Fronta = existujúce videá v poradí, ktoré nie sú hotové ani vyhodené.
  const fronta = poradie.filter((id) => !done.includes(id) && !skip.includes(id));
  const vyhodene = poradie.filter((id) => skip.includes(id) && !done.includes(id));

  const activeId = fronta[0];
  const active = activeId ? byId.get(activeId)! : null;
  const dalsie = fronta.slice(1);
  const hotove = videos.length - fronta.length - vyhodene.length;
  const fullCaption = active ? `${active.caption}\n\n${active.hashtags}` : '';

  // Akcie poradia --------------------------------------------------------------
  // Prehadzujeme len v rámci fronty; hotové/vyhodené id ostanú v poradí za ňou.
  function zapisFrontu(novaFronta: string[]) {
    const zvysok = poradie.filter((id) => !fronta.includes(id));
    ulozOrder([...novaFronta, ...zvysok]);
  }
  function dajPrve(id: string) {
    zapisFrontu([id, ...fronta.filter((x) => x !== id)]);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function posun(id: string, smer: -1 | 1) {
    const i = fronta.indexOf(id);
    const j = i + smer;
    if (i < 0 || j < 0 || j >= fronta.length) return;
    const next = [...fronta];
    [next[i], next[j]] = [next[j], next[i]];
    zapisFrontu(next);
  }
  // Aktuálne (vrchné) video pošle na koniec fronty — navrch príde ďalšie.
  function naKoniec(id: string) {
    zapisFrontu([...fronta.filter((x) => x !== id), id]);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function vyhod(id: string) {
    ulozSkip([...skip, id]);
    setCopied(false);
  }
  function vrat(id: string) {
    ulozSkip(skip.filter((x) => x !== id));
  }

  // Uloží video do galérie cez systémové zdieľanie (mobil), inak stiahne (desktop).
  async function ulozit() {
    if (!active) return;
    setBusy(true);
    try {
      const res = await fetch(active.src);
      const blob = await res.blob();
      const file = new File([blob], `${active.id}.mp4`, { type: 'video/mp4' });
      const nav = navigator as unknown as {
        canShare?: (d: { files: File[] }) => boolean;
        share?: (d: { files: File[]; title?: string }) => Promise<void>;
      };
      if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: active.nadpis });
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
    if (!active) return;
    ulozDone([...done, active.id]);
    setCopied(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Štýly ----------------------------------------------------------------------
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
  const ctrl: React.CSSProperties = {
    flex: '0 0 auto',
    width: 38,
    height: 38,
    borderRadius: 9,
    border: '1px solid #2a2a2a',
    background: '#1a1a1a',
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (!loaded) return <div style={wrap} />;

  // Fronta je prázdna --------------------------------------------------------
  if (!active) {
    return (
      <div style={{ ...wrap, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Fronta je prázdna!</h1>
        <p style={{ color: '#888', marginBottom: 28 }}>
          {vyhodene.length > 0
            ? `Postnuté máš ${hotove}, vyhodené ${vyhodene.length}.`
            : 'Pekná práca. Zajtra ďalšie.'}
        </p>
        {vyhodene.length > 0 && (
          <button onClick={() => ulozSkip([])} style={{ ...btn, backgroundColor: '#1a1a1a', color: '#c8f135', marginBottom: 12 }}>
            ↩︎ Vrátiť {vyhodene.length} vyhodené do fronty
          </button>
        )}
        <button onClick={() => ulozDone([])} style={{ ...btn, backgroundColor: '#1a1a1a', color: '#c8f135' }}>
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
          <b style={{ color: '#c8f135' }}>{hotove}</b> / {hotove + fronta.length} hotové
        </p>
      </div>
      {/* progress bar */}
      <div style={{ height: 6, background: '#1a1a1a', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${(hotove / (hotove + fronta.length)) * 100}%`, background: '#c8f135', transition: 'width .3s' }} />
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>{active.nadpis}</h1>

      {/* Ovládanie aktuálneho videa — dá sa aj toto vrchné posunúť/vyhodiť */}
      {fronta.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => naKoniec(active.id)}
            style={{ flex: 1, padding: '9px 8px', borderRadius: 9, border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#ccc', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            ⇊ Dať nižšie (postnem neskôr)
          </button>
          <button
            onClick={() => vyhod(active.id)}
            style={{ flex: '0 0 auto', padding: '9px 14px', borderRadius: 9, border: '1px solid #3a1e1e', background: '#1a1a1a', color: '#ff6b6b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            ✕ Vyhodiť
          </button>
        </div>
      )}

      {/* Video */}
      <video
        key={active.id}
        src={active.src}
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
        <p style={{ fontSize: 15, lineHeight: 1.5, margin: '0 0 6px' }}>{active.caption}</p>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: '#8ab4ff', margin: '0 0 12px' }}>{active.hashtags}</p>
        <button onClick={kopiruj} style={{ ...btn, backgroundColor: copied ? '#1a3a00' : '#2a2a2a', color: copied ? '#c8f135' : '#fff', fontSize: 14, padding: 12 }}>
          {copied ? '✓ Skopírované' : 'Kopírovať caption + hashtagy'}
        </button>
      </div>

      {/* 3. Done → ďalšie */}
      <button onClick={hotovo} style={{ ...btn, backgroundColor: '#183a18', color: '#c8f135', border: '1px solid #2f6b2f', marginTop: 12 }}>
        ✅ Hotovo — natiahni ďalšie video
      </button>
      <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
        Zostáva {fronta.length}. „Hotovo" ťukni až po postnutí na TikTok.
      </p>

      {/* Zoznam ďalších vo fronte */}
      {dalsie.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ color: '#888', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            📋 Ďalšie vo fronte ({dalsie.length})
          </p>
          {dalsie.map((id, i) => {
            const v = byId.get(id)!;
            return (
              <div
                key={id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 8, marginBottom: 8 }}
              >
                <button
                  onClick={() => dajPrve(id)}
                  title="Dať ako prvé"
                  style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '4px 2px' }}
                >
                  {v.nadpis}
                  <span style={{ display: 'block', color: '#666', fontSize: 11, fontWeight: 500, marginTop: 2 }}>ťuk = dať ako prvé</span>
                </button>
                <button onClick={() => posun(id, -1)} disabled={i === 0} style={{ ...ctrl, opacity: i === 0 ? 0.35 : 1 }} title="Vyššie">↑</button>
                <button onClick={() => posun(id, 1)} disabled={i === dalsie.length - 1} style={{ ...ctrl, opacity: i === dalsie.length - 1 ? 0.35 : 1 }} title="Nižšie">↓</button>
                <button onClick={() => vyhod(id)} style={{ ...ctrl, color: '#ff6b6b', borderColor: '#3a1e1e' }} title="Vyhodiť z fronty">✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Vyhodené — zbaliteľné, dajú sa vrátiť */}
      {vyhodene.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setUkazVyhodene((s) => !s)}
            style={{ background: 'transparent', border: 'none', color: '#777', fontSize: 12, cursor: 'pointer', padding: '4px 0' }}
          >
            {ukazVyhodene ? '▾' : '▸'} Vyhodené ({vyhodene.length})
          </button>
          {ukazVyhodene && (
            <div style={{ marginTop: 8 }}>
              {vyhodene.map((id) => {
                const v = byId.get(id)!;
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 10, padding: 8, marginBottom: 6 }}>
                    <span style={{ flex: 1, color: '#777', fontSize: 14 }}>{v.nadpis}</span>
                    <button onClick={() => vrat(id)} style={{ ...ctrl, width: 'auto', padding: '0 12px', color: '#c8f135', borderColor: '#2f4a1a', fontSize: 13 }}>↩︎ vrátiť</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

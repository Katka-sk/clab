'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MbKus } from './kusy';

// Stav sa drží v telefóne (localStorage) — rovnako ako CL fronta (tiktok-k7x9m/VideoQueue.tsx).
const DONE_KEY = 'mb-fronta-done-v1'; // postnuté — zmiznú z fronty
const ORDER_KEY = 'mb-fronta-order-v1'; // vlastné poradie (pole id)
const SKIP_KEY = 'mb-fronta-skip-v1'; // vyhodené — skryté, dajú sa vrátiť

// Schválené Katarínou 17.10.2026 (marketing/FABLE-PRIBEHY-SYSTEM-A-KARUSELY-2026-10-17.md)
const BIO = 'Quiet company for the longer road to motherhood.\nFree meditations ↓\nmindborn.io';
const ODPOVED = 'They’re fictional stories that reflect feelings I know from my own journey.';

const C = {
  bg: '#FBF6EF', paper: '#FFFFFF', ink: '#3B2A55', muted: '#7D7090', line: '#EADFEF',
  accent: '#6E4E9E', pink: '#F2BCC4', soft: '#F3ECF8', ok: '#2F6B45', okbg: '#E6F2EA', warn: '#A4462A',
};

function nacitaj(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function uloz(key: string, v: string[]) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}

export default function Fronta({ kusy }: { kusy: MbKus[] }) {
  const [done, setDone] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [skip, setSkip] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [kopia, setKopia] = useState('');
  const [busy, setBusy] = useState('');
  const [ukazVyhodene, setUkazVyhodene] = useState(false);

  // Stav z telefónu sa dá prečítať až po načítaní v prehliadači (na serveri localStorage nie je).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setDone(nacitaj(DONE_KEY));
    setOrder(nacitaj(ORDER_KEY));
    setSkip(nacitaj(SKIP_KEY));
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const byId = useMemo(() => new Map(kusy.map((k) => [k.id, k])), [kusy]);
  const poradie = useMemo(() => {
    const zname = order.filter((id) => byId.has(id));
    return [...zname, ...kusy.map((k) => k.id).filter((id) => !zname.includes(id))];
  }, [order, kusy, byId]);

  const fronta = poradie.filter((id) => !done.includes(id) && !skip.includes(id));
  const vyhodene = poradie.filter((id) => skip.includes(id) && !done.includes(id));
  const active = fronta[0] ? byId.get(fronta[0])! : null;
  const dalsie = fronta.slice(1);
  const hotove = done.filter((id) => byId.has(id)).length;
  const spolu = hotove + fronta.length;
  const fullCaption = active ? `${active.caption}\n\n${active.hashtags}` : '';

  function setD(v: string[]) { setDone(v); uloz(DONE_KEY, v); }
  function setO(v: string[]) { setOrder(v); uloz(ORDER_KEY, v); }
  function setS(v: string[]) { setSkip(v); uloz(SKIP_KEY, v); }
  function zapisFrontu(nova: string[]) { setO([...nova, ...poradie.filter((id) => !fronta.includes(id))]); }
  const hore = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  function dajPrve(id: string) { zapisFrontu([id, ...fronta.filter((x) => x !== id)]); hore(); }
  function posun(id: string, smer: -1 | 1) {
    const i = fronta.indexOf(id), j = i + smer;
    if (i < 0 || j < 0 || j >= fronta.length) return;
    const n = [...fronta]; [n[i], n[j]] = [n[j], n[i]]; zapisFrontu(n);
  }
  function naKoniec(id: string) { zapisFrontu([...fronta.filter((x) => x !== id), id]); setCopied(false); hore(); }
  function vyhod(id: string) { setS([...skip, id]); setCopied(false); }
  function hotovo() { if (!active) return; setD([...done, active.id]); setCopied(false); hore(); }
  function vratPosledny() { setD(done.slice(0, -1)); hore(); }

  // Mobil: systémové zdieľanie so súbormi → „Uložiť obrázky/video" (všetko naraz). Desktop: stiahnutie.
  async function ulozit() {
    if (!active) return;
    setBusy('Pripravujem…');
    try {
      const urls = active.typ === 'karusel' ? active.slajdy! : [active.video!];
      const files = await Promise.all(urls.map(async (u, i) => {
        const b = await (await fetch(u)).blob();
        const ext = u.split('.').pop() || (active.typ === 'karusel' ? 'png' : 'mp4');
        return new File([b], `${active.id}-${String(i + 1).padStart(2, '0')}.${ext}`, { type: b.type || (ext === 'mp4' ? 'video/mp4' : `image/${ext === 'jpg' ? 'jpeg' : ext}`) });
      }));
      const nav = navigator as unknown as { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[] }) => Promise<void> };
      if (nav.canShare && nav.share && nav.canShare({ files })) {
        setBusy('');
        await nav.share({ files });
      } else {
        for (const f of files) {
          const u = URL.createObjectURL(f), a = document.createElement('a');
          a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(u), 1500);
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    } catch { /* zrušené = v poriadku */ }
    setBusy('');
  }

  function kopirujText(t: string, id: string) {
    const ok = () => { setKopia(id); setTimeout(() => setKopia(''), 2000); };
    navigator.clipboard.writeText(t).then(ok).catch(() => {
      const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x);
      x.select(); document.execCommand('copy'); x.remove(); ok();
    });
  }

  function kopiruj() {
    const ok = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    navigator.clipboard.writeText(fullCaption).then(ok).catch(() => {
      const t = document.createElement('textarea'); t.value = fullCaption; document.body.appendChild(t);
      t.select(); document.execCommand('copy'); t.remove(); ok();
    });
  }

  const wrap: React.CSSProperties = { maxWidth: 520, margin: '0 auto', padding: '20px 16px 56px', fontFamily: 'Georgia, "Times New Roman", serif', background: C.bg, minHeight: '100vh', color: C.ink };
  const sans = '-apple-system, "Segoe UI", Roboto, sans-serif';
  const btn: React.CSSProperties = { display: 'block', width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', textAlign: 'center', fontFamily: sans };
  const ctrl: React.CSSProperties = { flex: '0 0 auto', width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.line}`, background: C.paper, color: C.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: sans };
  const lbl: React.CSSProperties = { fontFamily: sans, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.muted, margin: '0 0 8px' };

  const trvale = (
    <div style={{ marginTop: 30, fontFamily: sans }}>
      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <p style={lbl}>Ak sa niekto v komentároch opýta, či sú príbehy skutočné</p>
        <p style={{ fontSize: 15, lineHeight: 1.5, margin: '0 0 12px' }}>{ODPOVED}</p>
        <button onClick={() => kopirujText(ODPOVED, 'odpoved')} style={{ ...btn, padding: 12, fontSize: 14, background: kopia === 'odpoved' ? C.okbg : C.soft, color: kopia === 'odpoved' ? C.ok : C.ink }}>
          {kopia === 'odpoved' ? '✓ Skopírované' : 'Kopírovať odpoveď'}
        </button>
      </div>
      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
        <p style={lbl}>Bio účtu (Upraviť profil → Bio)</p>
        <p style={{ fontSize: 15, lineHeight: 1.5, margin: '0 0 12px', whiteSpace: 'pre-line' }}>{BIO}</p>
        <button onClick={() => kopirujText(BIO, 'bio')} style={{ ...btn, padding: 12, fontSize: 14, background: kopia === 'bio' ? C.okbg : C.soft, color: kopia === 'bio' ? C.ok : C.ink }}>
          {kopia === 'bio' ? '✓ Skopírované' : 'Kopírovať bio'}
        </button>
      </div>
    </div>
  );

  if (!loaded) return <div style={wrap} />;

  if (!active) {
    return (
      <div style={{ ...wrap, textAlign: 'center', paddingTop: 120 }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🤍</div>
        <h1 style={{ fontSize: 24, margin: '0 0 8px' }}>Fronta je prázdna</h1>
        <p style={{ color: C.muted, fontFamily: sans, margin: '0 0 28px' }}>
          Postnuté: {hotove}{vyhodene.length ? ` · vyhodené: ${vyhodene.length}` : ''}.
        </p>
        {vyhodene.length > 0 && (
          <button onClick={() => setS([])} style={{ ...btn, background: C.paper, color: C.accent, border: `1px solid ${C.line}`, marginBottom: 10 }}>↩︎ Vrátiť vyhodené do fronty</button>
        )}
        {hotove > 0 && (
          <button onClick={vratPosledny} style={{ ...btn, background: C.paper, color: C.muted, border: `1px solid ${C.line}` }}>↩︎ Vrátiť posledný „Hotovo“</button>
        )}
        <div style={{ textAlign: 'left' }}>{trvale}</div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, fontFamily: sans }}>
        <p style={{ color: C.accent, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>Mindborn · TikTok</p>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}><b style={{ color: C.accent }}>{hotove}</b> / {spolu} postnuté</p>
      </div>
      <div style={{ height: 6, background: C.line, borderRadius: 6, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ height: '100%', width: `${spolu ? (hotove / spolu) * 100 : 0}%`, background: C.accent, transition: 'width .3s' }} />
      </div>

      <p style={{ ...lbl, marginBottom: 4 }}>{active.typ === 'karusel' ? `Karusel · ${active.slajdy!.length} obrázkov` : active.typ === 'citat' ? 'Citát · video bez hlasu' : 'Video s hlasom'} · návrh na {active.den}</p>
      <h1 style={{ fontSize: 22, lineHeight: 1.25, margin: '0 0 14px' }}>{active.nazov}</h1>

      {active.typ === 'karusel' ? (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x mandatory', margin: '0 -16px 14px', padding: '0 16px 6px' }}>
          {active.slajdy!.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s} src={s} alt={`Obrázok ${i + 1}`} loading={i < 2 ? 'eager' : 'lazy'}
              style={{ flex: '0 0 78%', maxWidth: 360, aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 12, scrollSnapAlign: 'start', background: C.line }} />
          ))}
        </div>
      ) : (
        <video key={active.id} src={active.video} controls playsInline preload="metadata"
          style={{ width: '100%', maxHeight: '64vh', borderRadius: 14, background: '#000', display: 'block', marginBottom: 14 }} />
      )}

      <button onClick={ulozit} disabled={!!busy} style={{ ...btn, background: C.accent, color: '#fff', marginBottom: 6 }}>
        {busy || (active.typ === 'karusel' ? `⤓ Uložiť všetkých ${active.slajdy!.length} do galérie` : '⤓ Uložiť video do galérie')}
      </button>
      <p style={{ color: C.muted, fontSize: 12, textAlign: 'center', margin: '0 0 16px', fontFamily: sans }}>
        Otvorí sa menu → <b>Uložiť {active.typ === 'karusel' ? 'obrázky' : 'video'}</b>. Poradie obrázkov je už správne.
      </p>

      <div style={{ background: C.soft, borderRadius: 14, padding: '14px 16px', marginBottom: 12, fontFamily: sans, fontSize: 14, lineHeight: 1.5 }}>
        <p style={{ ...lbl, color: C.accent }}>Pred zverejnením v TikToku</p>
        {active.typ === 'karusel'
          ? <div>☐ AI štítok <b>netreba</b> — je to len text.</div>
          : <div>☐ <b>AI štítok zapnúť</b> (Viac možností → AI-generated content). Dodatočne sa pridať nedá.</div>}
        <div>☐ {active.typ === 'citat' ? 'Pekná hudba z TikToku — tu môže byť naplno, video nemá hlas.' : active.typ === 'video' ? 'Hudba z TikToku potichu (10–20 %, hlas musí byť počuť).' : 'Hudba z TikToku, potichu.'}</div>
        <div>☐ Nepísať „link in bio“.</div>
      </div>

      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <p style={lbl}>Popis</p>
        <p style={{ fontSize: 15, lineHeight: 1.5, margin: '0 0 6px', fontFamily: sans }}>{active.caption}</p>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: C.accent, margin: '0 0 12px', fontFamily: sans }}>{active.hashtags}</p>
        <button onClick={kopiruj} style={{ ...btn, padding: 12, fontSize: 14, background: copied ? C.okbg : C.soft, color: copied ? C.ok : C.ink }}>
          {copied ? '✓ Skopírované' : 'Kopírovať popis + hashtagy'}
        </button>
      </div>

      <button onClick={hotovo} style={{ ...btn, background: C.okbg, color: C.ok, border: `1px solid #BFDCC8`, marginTop: 6 }}>✅ Hotovo — ukáž ďalší</button>
      <p style={{ color: C.muted, fontSize: 12, textAlign: 'center', margin: '8px 0 0', fontFamily: sans }}>„Hotovo“ ťukni až po zverejnení. Zostáva {fronta.length}.</p>

      {fronta.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, fontFamily: sans }}>
          <button onClick={() => naKoniec(active.id)} style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: `1px solid ${C.line}`, background: C.paper, color: C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>⇊ Tento neskôr</button>
          <button onClick={() => vyhod(active.id)} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.line}`, background: C.paper, color: C.warn, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✕ Vyhodiť</button>
        </div>
      )}

      {dalsie.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <p style={lbl}>Ďalšie vo fronte ({dalsie.length})</p>
          {dalsie.map((id, i) => {
            const k = byId.get(id)!;
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, marginBottom: 8 }}>
                <button onClick={() => dajPrve(id)} style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', color: C.ink, fontSize: 15, cursor: 'pointer', padding: '4px 2px', fontFamily: 'inherit' }}>
                  {k.nazov}
                  <span style={{ display: 'block', color: C.muted, fontSize: 11, marginTop: 2, fontFamily: sans }}>{k.den} · {k.typ === 'citat' ? 'citát' : k.typ} · ťuk = dať ako prvý</span>
                </button>
                <button onClick={() => posun(id, -1)} disabled={i === 0} style={{ ...ctrl, opacity: i === 0 ? 0.35 : 1 }} aria-label="Vyššie">↑</button>
                <button onClick={() => posun(id, 1)} disabled={i === dalsie.length - 1} style={{ ...ctrl, opacity: i === dalsie.length - 1 ? 0.35 : 1 }} aria-label="Nižšie">↓</button>
              </div>
            );
          })}
        </div>
      )}

      {(vyhodene.length > 0 || hotove > 0) && (
        <div style={{ marginTop: 18, fontFamily: sans }}>
          {hotove > 0 && (
            <button onClick={vratPosledny} style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', padding: '4px 0', display: 'block' }}>↩︎ Vrátiť posledný „Hotovo“ (ťukla som omylom)</button>
          )}
          {vyhodene.length > 0 && (
            <>
              <button onClick={() => setUkazVyhodene((s) => !s)} style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', padding: '4px 0' }}>
                {ukazVyhodene ? '▾' : '▸'} Vyhodené ({vyhodene.length})
              </button>
              {ukazVyhodene && vyhodene.map((id) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <span style={{ flex: 1, color: C.muted, fontSize: 14 }}>{byId.get(id)!.nazov}</span>
                  <button onClick={() => setS(skip.filter((x) => x !== id))} style={{ ...ctrl, width: 'auto', padding: '0 12px', color: C.accent, fontSize: 13 }}>↩︎ vrátiť</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {trvale}
    </div>
  );
}

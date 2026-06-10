'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

const client = createClient({
  projectId: '74b6xpqc',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
});

const builder = imageUrlBuilder(client);
function urlFor(source: any) {
  return builder.image(source).width(800).url();
}

const CATEGORIES = ['VŠETKY', 'STAROVEK', 'STREDOVEK', 'MODERNA', 'KRÁĽOVSTVO', 'VEDA', 'MEDICÍNA', 'VOJENSTVO', 'KULTÚRA'];
const PER_PAGE = 6;

type Pikoska = {
  _id: string;
  poradoveCislo: number;
  nadpis: string;
  slug: { current: string };
  kategoria: string;
  perex: string;
  obsah: any[];
  casCtania: string;
  obrazok?: any;
  pioskaDna?: boolean;
};

function GreenTitle({ nadpis, size }: { nadpis: string; size: 'hero' | 'detail' }) {
  const words = nadpis.split(' ');
  const lastWord = words.pop();
  const rest = words.join(' ');
  const fontSize = size === 'hero' ? '60px' : '80px';
  return (
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize, lineHeight: size === 'hero' ? '1.0' : '0.95', marginBottom: size === 'detail' ? '28px' : '0' }}>
      {rest} <span style={{ color: '#c8f135' }}>{lastWord}</span>
    </div>
  );
}

export default function Home() {
  const [pikoskyAll, setPikoskyAll] = useState<Pikoska[]>([]);
  const [heroPikoska, setHeroPikoska] = useState<Pikoska | null>(null);
  const [view, setView] = useState<'home' | 'detail'>('home');
  const [selected, setSelected] = useState<Pikoska | null>(null);
  const [cat, setCat] = useState('VŠETKY');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.fetch(`*[_type == "pikoska" && datumPublikacie <= now()] | order(poradoveCislo asc) {
      _id, poradoveCislo, nadpis, slug, kategoria, perex, obsah, casCtania, obrazok, pioskaDna
    }`).then(data => {
      setPikoskyAll(data);
      const hero = data.find((p: Pikoska) => p.pioskaDna) || data[0];
      setHeroPikoska(hero);
      setLoading(false);
    });
  }, []);

  const filtered = cat === 'VŠETKY' ? pikoskyAll : pikoskyAll.filter(p => p.kategoria === cat);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const currentIdx = selected ? pikoskyAll.findIndex(p => p._id === selected._id) : -1;
  const nextPikoska = selected ? pikoskyAll[(currentIdx + 1) % pikoskyAll.length] : null;

  function openDetail(p: Pikoska) {
    setSelected(p);
    setView('detail');
    window.scrollTo(0, 0);
  }

  function goHome() {
    setView('home');
    window.scrollTo(0, 0);
  }

  function renderObsah(obsah: any[]) {
    if (!obsah) return null;
    return obsah.map((block, i) => (
      <p key={i} style={{ marginBottom: '24px', fontSize: '18px', color: '#bbb', lineHeight: '1.9', fontFamily: "'Barlow', sans-serif" }}>
        {block.children?.map((child: any) => child.text).join('')}
      </p>
    ));
  }

  if (loading) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8f135', fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', letterSpacing: '4px' }}>
      NAČÍTAVAM...
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0a; color: white; font-family: 'Barlow', sans-serif; }
        .navbar { border-bottom: 1px solid #1a1a1a; padding: 16px 0; position: sticky; top: 0; background: #0a0a0a; z-index: 100; }
        .navbar-inner { max-width: 1300px; margin: 0 auto; padding: 0 32px; display: flex; align-items: center; }
        .logo { display: flex; align-items: center; gap: 12px; background: none; border: none; cursor: pointer; }
        .logo-icon { background: #c8f135; width: 38px; height: 38px; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px #c8f13544; }
        .logo-icon img { width: 100%; height: 100%; object-fit: cover; }
        .logo-text { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 4px; color: white; }
        .cats { border-bottom: 1px solid #1a1a1a; padding: 12px 0; }
        .cats-inner { max-width: 1300px; margin: 0 auto; padding: 0 80px; display: flex; gap: 8px; flex-wrap: wrap; }
        .pill { padding: 7px 18px; border-radius: 50px; font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 1px; cursor: pointer; border: 1px solid #222; color: #777; background: transparent; transition: all 0.2s; }
        .pill:hover { border-color: #c8f135; color: #c8f135; }
        .pill.on { background: #c8f135; color: #000; border-color: #c8f135; }
        .hero { max-width: 1300px; margin: 0 auto; padding: 32px 80px; display: flex; gap: 48px; align-items: center; }
        .hero-img { width: 50%; aspect-ratio: 4/3; background: #111; border-radius: 14px; position: relative; overflow: hidden; flex-shrink: 0; cursor: pointer; }
        .hero-img img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; transition: transform 0.4s; }
        .hero-img:hover img { transform: scale(1.04); }
        .hero-badge { position: absolute; top: 16px; left: 16px; background: #c8f135; color: #000; padding: 6px 14px; border-radius: 50px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; z-index: 2; }
        .hero-con { flex: 1; display: flex; flex-direction: column; gap: 14px; }
        .hero-cat { color: #c8f135; font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 3px; }
        .hero-desc { color: #bbb; font-size: 16px; line-height: 1.8; }
        .hero-actions { display: flex; align-items: center; gap: 20px; margin-top: 8px; }
        .rbtn { background: white; color: black; padding: 14px 32px; border-radius: 50px; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 14px; letter-spacing: 2px; cursor: pointer; border: none; transition: background 0.2s; }
        .rbtn:hover { background: #c8f135; }
        .rtime { color: #555; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 1px; }
        .archive { max-width: 1300px; margin: 0 auto; padding: 16px 80px 0; }
        .divider { border-top: 1px solid #1a1a1a; padding-top: 32px; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .card { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; overflow: hidden; cursor: pointer; transition: border-color 0.25s, box-shadow 0.25s; }
        .card:hover { border-color: #c8f135; box-shadow: 0 0 0 1px #c8f135, 0 8px 32px #c8f13518; }
        .card-img-wrap { overflow: hidden; height: 220px; position: relative; background: #1a1a1a; }
        .card-img-wrap img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; transition: transform 0.4s; }
        .card:hover .card-img-wrap img { transform: scale(1.06); }
        .card-meta { position: absolute; top: 12px; left: 12px; color: #c8f135; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; font-weight: 700; }
        .card-body { padding: 20px; }
        .card-cat { color: #c8f135; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; margin-bottom: 8px; }
        .card-title { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 700; line-height: 1.3; margin-bottom: 14px; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1a1a1a; padding-top: 12px; }
        .card-time { color: #444; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1px; }
        .card-arrow { color: #c8f135; font-size: 16px; transition: transform 0.2s; display: inline-block; }
        .card:hover .card-arrow { transform: translateX(4px); }
        .pag { max-width: 1300px; margin: 0 auto; padding: 40px 80px 80px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .pb { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #222; color: #666; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: transparent; }
        .pb:hover { border-color: #c8f135; color: #c8f135; }
        .pb.on { background: #c8f135; color: #000; border-color: #c8f135; }
        .detail-img-block { max-width: 1300px; margin: 0 auto; padding: 32px 80px 0; }
        .detail-img { width: 100%; height: 420px; border-radius: 16px; overflow: hidden; position: relative; background: #111; }
        .detail-img img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; }
        .detail-img-badge { position: absolute; bottom: 20px; left: 20px; background: #c8f135; color: #000; padding: 6px 14px; border-radius: 4px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; }
        .detail-img-cat { position: absolute; top: 20px; right: 20px; color: #888; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 3px; border: 1px solid #333; padding: 5px 12px; border-radius: 4px; background: rgba(0,0,0,0.5); }
        .detail-article { max-width: 900px; margin: 0 auto; padding: 48px 80px 0; }
        .detail-perex { font-size: 20px; color: #999; line-height: 1.8; margin-bottom: 48px; font-style: italic; border-left: 3px solid #c8f135; padding-left: 20px; }
        .eline { max-width: 900px; margin: 0 auto; padding: 0 80px 48px; display: flex; align-items: center; gap: 20px; }
        .eline hr { flex: 1; border: none; border-top: 1px solid #222; }
        .eline span { color: #333; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 3px; white-space: nowrap; }
        .bottom-actions { max-width: 1300px; margin: 0 auto; padding: 0 80px 80px; display: flex; align-items: center; gap: 16px; }
        .btn-back { display: inline-flex; align-items: center; gap: 10px; color: #888; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 2px; cursor: pointer; background: transparent; border: 1px solid #333; padding: 16px 28px; border-radius: 50px; transition: all 0.2s; white-space: nowrap; }
        .btn-back:hover { border-color: #666; color: white; }
        .btn-next { display: flex; align-items: center; gap: 20px; flex: 1; cursor: pointer; background: #111; border: 1px solid #1a1a1a; padding: 20px 28px; border-radius: 50px; transition: all 0.25s; text-align: left; }
        .btn-next:hover { border-color: #c8f135; box-shadow: 0 0 0 1px #c8f135, 0 4px 20px #c8f13520; background: #141414; }
        .btn-next-thumb { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; background: #1a1a1a; flex-shrink: 0; }
        .btn-next-thumb img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; }
        .btn-next-text { flex: 1; }
        .btn-next-label { color: #c8f135; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; margin-bottom: 4px; }
        .btn-next-title { color: white; font-family: 'Bebas Neue', sans-serif; font-size: 28px; line-height: 1.0; }
        .btn-next-arrow { color: #c8f135; font-size: 28px; transition: transform 0.2s; flex-shrink: 0; }
        .btn-next:hover .btn-next-arrow { transform: translateX(6px); }
        .foot { border-top: 1px solid #1a1a1a; padding: 28px 0; }
        .foot-in { max-width: 1300px; margin: 0 auto; padding: 0 80px; display: flex; align-items: center; justify-content: space-between; }
        .flogo { display: flex; align-items: center; gap: 12px; }
        .fic { background: #c8f135; width: 32px; height: 32px; border-radius: 8px; overflow: hidden; }
        .fic img { width: 100%; height: 100%; object-fit: cover; }
        .fnm { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 2px; }
        .fsub { color: #444; font-size: 11px; margin-top: 2px; }
        .flinks { display: flex; gap: 28px; }
        .flink { color: #444; font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 1px; cursor: pointer; background: none; border: none; }
        .flink:hover { color: #c8f135; }
      `}</style>

      <nav className="navbar">
        <div className="navbar-inner">
          <button className="logo" onClick={goHome}>
            <div className="logo-icon"><img src="/logo.png" alt="logo" /></div>
            <span className="logo-text">CURIOSITY LAB</span>
          </button>
        </div>
      </nav>

      <div className="cats">
        <div className="cats-inner">
          {CATEGORIES.map(c => (
            <button key={c} className={`pill${cat === c ? ' on' : ''}`} onClick={() => { setCat(c); setPage(1); if (view === 'detail') goHome(); }}>
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {view === 'home' && (
        <>
          {heroPikoska && (cat === 'VŠETKY' || cat === heroPikoska.kategoria) && (
            <div className="hero">
              <div className="hero-img" onClick={() => openDetail(heroPikoska)}>
                {heroPikoska.obrazok
                  ? <img src={urlFor(heroPikoska.obrazok)} alt={heroPikoska.nadpis} />
                  : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />
                }
                <div className="hero-badge">PIKOŠKA DŇA</div>
              </div>
              <div className="hero-con">
                <div className="hero-cat">{heroPikoska.kategoria} · {heroPikoska.casCtania} ČÍTANIA</div>
                <GreenTitle nadpis={heroPikoska.nadpis} size="hero" />
                <div className="hero-desc">{heroPikoska.perex}</div>
                <div className="hero-actions">
                  <button className="rbtn" onClick={() => openDetail(heroPikoska)}>ČÍTAŤ SPIS</button>
                  <div className="rtime">⏱ {heroPikoska.casCtania}</div>
                </div>
              </div>
            </div>
          )}

          <div className="archive">
            <div className="divider" />
            <div className="grid">
              {pageItems.map(p => (
                <div key={p._id} className="card" onClick={() => openDetail(p)}>
                  <div className="card-img-wrap">
                    {p.obrazok
                      ? <img src={urlFor(p.obrazok)} alt={p.nadpis} />
                      : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />
                    }
                    <div className="card-meta">#{String(p.poradoveCislo).padStart(3, '0')} · {p.kategoria}</div>
                  </div>
                  <div className="card-body">
                    <div className="card-cat">{p.kategoria}</div>
                    <div className="card-title">{p.nadpis}</div>
                    <div className="card-footer">
                      <div className="card-time">⏱ {p.casCtania}</div>
                      <span className="card-arrow">→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pag">
              <button className="pb" onClick={() => setPage(p => Math.max(1, p - 1))}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} className={`pb${n === page ? ' on' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="pb" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>→</button>
            </div>
          )}
        </>
      )}

      {view === 'detail' && selected && (
        <>
          <div className="detail-img-block">
            <div className="detail-img">
              {selected.obrazok
                ? <img src={urlFor(selected.obrazok)} alt={selected.nadpis} />
                : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />
              }
              <div className="detail-img-badge">SPIS #{String(selected.poradoveCislo).padStart(3, '0')}</div>
              <div className="detail-img-cat">{selected.kategoria}</div>
            </div>
          </div>

          <div className="detail-article">
            <GreenTitle nadpis={selected.nadpis} size="detail" />
            <div className="detail-perex">{selected.perex}</div>
            <div>{renderObsah(selected.obsah)}</div>
          </div>

          <div className="eline"><hr /><span>KONIEC VEREJNÉHO SPISU</span><hr /></div>

          <div className="bottom-actions">
            <button className="btn-back" onClick={goHome}>← ARCHÍV</button>
            {nextPikoska && (
              <button className="btn-next" onClick={() => openDetail(nextPikoska)}>
                <div className="btn-next-thumb">
                  {nextPikoska.obrazok
                    ? <img src={urlFor(nextPikoska.obrazok)} alt={nextPikoska.nadpis} />
                    : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />
                  }
                </div>
                <div className="btn-next-text">
                  <div className="btn-next-label">ĎALŠÍ SPIS</div>
                  <div className="btn-next-title">{nextPikoska.nadpis}</div>
                </div>
                <span className="btn-next-arrow">→</span>
              </button>
            )}
          </div>
        </>
      )}

      <footer className="foot">
        <div className="foot-in">
          <div className="flogo">
            <div className="fic"><img src="/logo.png" alt="logo" /></div>
            <div>
              <div className="fnm">CURIOSITY LAB</div>
              <div className="fsub">Každý deň jeden zabudnutý fakt z histórie.</div>
            </div>
          </div>
          <div className="flinks">
            <button className="flink">O NÁS</button>
            <button className="flink">KONTAKT</button>
            <button className="flink">OCHRANA SÚKROMIA</button>
          </div>
        </div>
      </footer>
    </>
  );
}

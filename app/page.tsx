import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import Link from 'next/link';

const client = createClient({
  projectId: '74b6xpqc',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
});

const builder = imageUrlBuilder(client);
function urlFor(source: any, width: number) {
  return builder.image(source).width(width).auto('format').url();
}

const CATEGORIES = ['VŠETKY', 'STAROVEK', 'STREDOVEK', 'MODERNA', 'KRÁĽOVSTVO', 'VEDA', 'MEDICÍNA', 'VOJENSTVO', 'KULTÚRA'];
const PER_PAGE = 6;

// Revalidate periodically so "pikoška dňa" stays fresh.
export const revalidate = 300;

type Pikoska = {
  _id: string;
  poradoveCislo: number;
  nadpis: string;
  slug: { current: string };
  kategoria: string;
  perex: string;
  casCtania: string;
  obrazok?: any;
  datumPublikacie?: string;
};

function GreenTitle({ nadpis }: { nadpis: string }) {
  const words = nadpis.split(' ');
  const lastWord = words.pop();
  const rest = words.join(' ');
  return (
    <div className="green-title green-title-hero" style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: '1.0', marginBottom: '0' }}>
      {rest} <span style={{ color: '#c8f135' }}>{lastWord}</span>
    </div>
  );
}

// Build a URL that preserves the current category while changing the page.
function hrefFor(kat: string, page: number) {
  const params = new URLSearchParams();
  if (kat !== 'VŠETKY') params.set('kat', kat);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kat?: string }>;
}) {
  const sp = await searchParams;
  const kat = sp.kat && CATEGORIES.includes(sp.kat) ? sp.kat : 'VŠETKY';
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);

  // 1) Hero "pikoška dňa": dnešná podľa dátumu, fallback na najnovšiu publikovanú.
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const heroFields = `_id, poradoveCislo, nadpis, slug, kategoria, perex, casCtania, obrazok, datumPublikacie`;
  const { todayHero, latestHero } = await client.fetch<{ todayHero: Pikoska | null; latestHero: Pikoska | null }>(
    `{
      "todayHero": *[_type == "pikoska" && datumPublikacie >= $start && datumPublikacie < $end] | order(datumPublikacie desc)[0]{ ${heroFields} },
      "latestHero": *[_type == "pikoska" && datumPublikacie <= now()] | order(poradoveCislo desc)[0]{ ${heroFields} }
    }`,
    { start: today, end: tomorrow }
  );
  const heroPikoska = todayHero || latestHero;
  const heroId = heroPikoska?._id ?? '';

  // 2) Grid: len 6 pikoshiek pre aktuálnu stránku a kategóriu, bez hero pikošky.
  const catFilter = kat !== 'VŠETKY' ? ` && kategoria == $kat` : '';
  const base = `_type == "pikoska" && datumPublikacie <= now() && _id != $heroId${catFilter}`;
  const start = (page - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const { total, items } = await client.fetch<{ total: number; items: Pikoska[] }>(
    `{
      "total": count(*[${base}]),
      "items": *[${base}] | order(poradoveCislo desc)[$start...$end]{
        _id, poradoveCislo, nadpis, slug, kategoria, perex, casCtania, obrazok
      }
    }`,
    { heroId, kat, start, end }
  );

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const showHero = page === 1 && heroPikoska && (kat === 'VŠETKY' || kat === heroPikoska.kategoria);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0a; color: white; font-family: 'Barlow', sans-serif; }
        .navbar { border-bottom: 1px solid #1a1a1a; padding: 16px 0; position: sticky; top: 0; background: #0a0a0a; z-index: 100; }
        .navbar-inner { max-width: 1300px; margin: 0 auto; padding: 0 32px; display: flex; align-items: center; }
        .logo { display: flex; align-items: center; gap: 12px; background: none; border: none; cursor: pointer; text-decoration: none; }
        .logo-icon { background: #c8f135; width: 38px; height: 38px; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px #c8f13544; }
        .logo-icon img { width: 100%; height: 100%; object-fit: cover; }
        .logo-text { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 4px; color: white; }
        .cats { border-bottom: 1px solid #1a1a1a; padding: 12px 0; }
        .cats-inner { max-width: 1300px; margin: 0 auto; padding: 0 80px; display: flex; gap: 8px; flex-wrap: wrap; }
        .pill { padding: 7px 18px; border-radius: 50px; font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 1px; cursor: pointer; border: 1px solid #222; color: #777; background: transparent; transition: all 0.2s; text-decoration: none; }
        .pill:hover { border-color: #c8f135; color: #c8f135; }
        .pill.on { background: #c8f135; color: #000; border-color: #c8f135; }
        .hero { max-width: 1300px; margin: 0 auto; padding: 32px 80px; display: flex; gap: 48px; align-items: center; }
        .hero-img { width: 50%; aspect-ratio: 4/3; background: #111; border-radius: 14px; position: relative; overflow: hidden; flex-shrink: 0; cursor: pointer; display: block; }
        .hero-img img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; transition: transform 0.4s; }
        .hero-img:hover img { transform: scale(1.04); }
        .hero-badge { position: absolute; top: 16px; left: 16px; background: #c8f135; color: #000; padding: 6px 14px; border-radius: 50px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; z-index: 2; }
        .hero-con { flex: 1; display: flex; flex-direction: column; gap: 14px; }
        .hero-cat { color: #d4ff4f; font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 3px; }
        .hero-desc { color: #bbb; font-size: 16px; line-height: 1.8; }
        .hero-actions { display: flex; align-items: center; gap: 20px; margin-top: 8px; }
        .rbtn { background: white; color: black; padding: 14px 32px; border-radius: 50px; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 14px; letter-spacing: 2px; cursor: pointer; border: none; transition: background 0.2s; text-decoration: none; display: inline-block; }
        .rbtn:hover { background: #c8f135; }
        .rtime { color: #555; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 1px; }
        .archive { max-width: 1300px; margin: 0 auto; padding: 16px 80px 0; }
        .divider { border-top: 1px solid #1a1a1a; padding-top: 32px; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .card { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; overflow: hidden; cursor: pointer; transition: border-color 0.25s, box-shadow 0.25s; text-decoration: none; color: inherit; display: block; }
        .card:hover { border-color: #c8f135; box-shadow: 0 0 0 1px #c8f135, 0 8px 32px #c8f13518; }
        .card-img-wrap { overflow: hidden; height: 220px; position: relative; background: #1a1a1a; }
        .card-img-wrap img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; transition: transform 0.4s; }
        .card:hover .card-img-wrap img { transform: scale(1.06); }
        .card-meta { position: absolute; top: 12px; left: 12px; color: #c8f135; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; font-weight: 700; }
        .card-body { padding: 20px; }
        .card-cat { display: inline-block; color: #000; background: #c8f135; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; font-weight: 700; padding: 3px 10px; border-radius: 4px; margin-bottom: 10px; }
        .card-title { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 700; line-height: 1.3; margin-bottom: 14px; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1a1a1a; padding-top: 12px; }
        .card-time { color: #888; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1px; }
        .card-arrow { color: #c8f135; font-size: 16px; transition: transform 0.2s; display: inline-block; }
        .card:hover .card-arrow { transform: translateX(4px); }
        .pag { max-width: 1300px; margin: 0 auto; padding: 40px 80px 80px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .pb { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #222; color: #888; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: transparent; text-decoration: none; }
        .pb:hover { border-color: #c8f135; color: #c8f135; }
        .pb.on { background: #c8f135; color: #000; border-color: #c8f135; }
        .pb.disabled { opacity: 0.3; pointer-events: none; }
        .foot { border-top: 1px solid #1a1a1a; padding: 28px 0; }
        .foot-in { max-width: 1300px; margin: 0 auto; padding: 0 80px; display: flex; align-items: center; justify-content: space-between; }
        .flogo { display: flex; align-items: center; gap: 12px; }
        .fic { background: #c8f135; width: 32px; height: 32px; border-radius: 8px; overflow: hidden; }
        .fic img { width: 100%; height: 100%; object-fit: cover; }
        .fnm { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 2px; }
        .fsub { color: #ccc; font-size: 17px; font-style: italic; font-weight: 400; margin-top: 6px; }
        .flinks { display: flex; gap: 28px; }
        .flink { color: #ddd; font-family: 'Barlow Condensed', sans-serif; font-size: 15px; letter-spacing: 1px; cursor: pointer; background: none; border: none; text-decoration: none; }
        .flink:hover { color: #c8f135; }
        .green-title-hero { font-size: 60px; }
        @media (max-width: 768px) {
          .navbar { padding: 10px 0; }
          .navbar-inner { padding: 0 16px; }
          .cats-inner { padding: 0 16px; }
          .hero { flex-direction: column; padding: 20px 16px; gap: 20px; }
          .hero-img { width: 100%; aspect-ratio: 16/9; }
          .hero-con { width: 100%; overflow: hidden; }
          .green-title-hero { font-size: 40px !important; word-break: break-word; overflow: hidden; }
          .hero-desc { overflow: hidden; word-break: break-word; }
          .archive { padding: 12px 16px 0; }
          .grid { grid-template-columns: 1fr !important; }
          .pag { padding: 28px 16px 48px; }
          .foot-in { padding: 0 16px; flex-direction: column; gap: 20px; align-items: flex-start; }
          .flinks { flex-wrap: wrap; gap: 16px; }
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/" className="logo">
            <div className="logo-icon"><img src="/logo.png" alt="logo" /></div>
            <span className="logo-text">CURIOSITY LAB</span>
          </Link>
        </div>
      </nav>

      <div className="cats">
        <div className="cats-inner">
          {CATEGORIES.map(c => (
            <Link key={c} href={hrefFor(c, 1)} className={`pill${kat === c ? ' on' : ''}`}>
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>
      </div>

      {showHero && heroPikoska && (
        <div className="hero">
          <Link href={`/pikoska/${heroPikoska.slug.current}`} className="hero-img">
            {heroPikoska.obrazok
              ? <img src={urlFor(heroPikoska.obrazok, 1000)} alt={heroPikoska.nadpis} />
              : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />
            }
            <div className="hero-badge">PIKOŠKA DŇA</div>
          </Link>
          <div className="hero-con">
            <div className="hero-cat">{heroPikoska.kategoria} · {heroPikoska.casCtania} ČÍTANIA</div>
            <GreenTitle nadpis={heroPikoska.nadpis} />
            <div className="hero-desc">{heroPikoska.perex}</div>
            <div className="hero-actions">
              <Link href={`/pikoska/${heroPikoska.slug.current}`} className="rbtn">ČÍTAŤ SPIS</Link>
              <div className="rtime">⏱ {heroPikoska.casCtania}</div>
            </div>
          </div>
        </div>
      )}

      <div className="archive">
        <div className="divider" />
        <div className="grid">
          {items.map(p => (
            <Link key={p._id} href={`/pikoska/${p.slug.current}`} className="card">
              <div className="card-img-wrap">
                {p.obrazok
                  ? <img src={urlFor(p.obrazok, 800)} alt={p.nadpis} loading="lazy" />
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
            </Link>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pag">
          <Link href={hrefFor(kat, Math.max(1, page - 1))} className={`pb${page === 1 ? ' disabled' : ''}`} aria-disabled={page === 1}>←</Link>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <Link key={n} href={hrefFor(kat, n)} className={`pb${n === page ? ' on' : ''}`}>{n}</Link>
          ))}
          <Link href={hrefFor(kat, Math.min(totalPages, page + 1))} className={`pb${page === totalPages ? ' disabled' : ''}`} aria-disabled={page === totalPages}>→</Link>
        </div>
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
            <a href="mailto:info.curiositylab@gmail.com" className="flink">KONTAKT</a>
            <Link href="/ochrana-sukromia" className="flink">OCHRANA SÚKROMIA</Link>
          </div>
        </div>
      </footer>
    </>
  );
}

import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

const client = createClient({
  projectId: '74b6xpqc',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
});

const builder = imageUrlBuilder(client);
function urlFor(source: any) {
  return builder.image(source).width(1600).auto('format').url();
}
function urlForThumb(source: any) {
  return builder.image(source).width(120).height(120).fit('crop').auto('format').url();
}
function urlForOg(source: any) {
  return builder.image(source).width(1200).height(630).fit('crop').url();
}

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
};

async function getPikoska(slug: string): Promise<Pikoska | null> {
  return client.fetch(
    `*[_type == "pikoska" && slug.current == $slug][0] {
      _id, poradoveCislo, nadpis, slug, kategoria, perex, obsah, casCtania, obrazok
    }`,
    { slug }
  );
}

async function getNextPikoska(poradoveCislo: number): Promise<Pikoska | null> {
  return client.fetch(
    `*[_type == "pikoska" && datumPublikacie <= now() && poradoveCislo < $num] | order(poradoveCislo desc)[0] {
      _id, poradoveCislo, nadpis, slug, obrazok
    }`,
    { num: poradoveCislo }
  );
}

export async function generateStaticParams() {
  const slugs: { slug: string }[] = await client.fetch(
    `*[_type == "pikoska"] { "slug": slug.current }`
  );
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPikoska(slug);
  if (!p) return { title: 'Curiosity Lab' };

  const ogImage = p.obrazok ? urlForOg(p.obrazok) : undefined;

  return {
    title: `${p.nadpis} | Curiosity Lab`,
    description: p.perex,
    openGraph: {
      title: `${p.nadpis} | Curiosity Lab`,
      description: p.perex,
      url: `https://curiositylab.sk/pikoska/${slug}`,
      siteName: 'Curiosity Lab',
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: p.nadpis }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${p.nadpis} | Curiosity Lab`,
      description: p.perex,
      images: ogImage ? [ogImage] : [],
    },
  };
}

function GreenTitle({ nadpis }: { nadpis: string }) {
  const words = nadpis.split(' ');
  const lastWord = words.pop();
  const rest = words.join(' ');
  return (
    <div className="green-title-detail" style={{ fontFamily: "var(--font-bebas), sans-serif", lineHeight: '0.95', marginBottom: '28px' }}>
      {rest} <span style={{ color: '#c8f135' }}>{lastWord}</span>
    </div>
  );
}

function renderObsah(obsah: any[]) {
  if (!obsah) return null;
  return obsah.map((block, i) => (
    <p key={i} style={{ marginBottom: '24px', fontSize: '18px', color: '#bbb', lineHeight: '1.9', fontFamily: "var(--font-barlow), sans-serif" }}>
      {block.children?.map((child: any) => child.text).join('')}
    </p>
  ));
}

export default async function PikoskaDetail(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const pikoska = await getPikoska(slug);
  if (!pikoska) notFound();

  const next = await getNextPikoska(pikoska.poradoveCislo);

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0a; color: white; font-family: var(--font-barlow), sans-serif; }
        .navbar { border-bottom: 1px solid #1a1a1a; padding: 16px 0; position: sticky; top: 0; background: #0a0a0a; z-index: 100; }
        .navbar-inner { max-width: 1300px; margin: 0 auto; padding: 0 32px; display: flex; align-items: center; }
        .logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .logo-icon { background: #c8f135; width: 38px; height: 38px; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px #c8f13544; }
        .logo-icon img { width: 100%; height: 100%; object-fit: cover; }
        .logo-text { font-family: var(--font-bebas), sans-serif; font-size: 20px; letter-spacing: 4px; color: white; }
        .detail-img-block { max-width: 1300px; margin: 0 auto; padding: 32px 80px 0; }
        .detail-img { width: 100%; height: 420px; border-radius: 16px; overflow: hidden; position: relative; background: #111; }
        .detail-img img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; }
        .detail-img-cat { position: absolute; top: 20px; right: 20px; color: #000; font-family: var(--font-barlow-condensed), sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 3px; border: none; padding: 6px 14px; border-radius: 4px; background: #c8f135; }
        .detail-article { max-width: 900px; margin: 0 auto; padding: 48px 80px 0; }
        .detail-perex { font-size: 20px; color: #999; line-height: 1.8; margin-bottom: 48px; font-style: italic; border-left: 3px solid #c8f135; padding-left: 20px; }
        .eline { max-width: 900px; margin: 0 auto; padding: 0 80px 48px; display: flex; align-items: center; gap: 20px; }
        .eline hr { flex: 1; border: none; border-top: 1px solid #222; }
        .eline span { color: #333; font-family: var(--font-barlow-condensed), sans-serif; font-size: 12px; letter-spacing: 3px; white-space: nowrap; }
        .bottom-actions { max-width: 1300px; margin: 0 auto; padding: 0 80px 80px; display: flex; align-items: center; gap: 16px; }
        .btn-back { display: inline-flex; align-items: center; gap: 10px; color: #fff; font-family: var(--font-barlow-condensed), sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 2px; background: transparent; border: 2px solid #c8f135; padding: 18px 34px; border-radius: 50px; transition: all 0.2s; white-space: nowrap; text-decoration: none; }
        .btn-back:hover { background: #c8f135; color: #000; }
        .btn-next { display: flex; align-items: center; gap: 20px; flex: 1; background: #111; border: 1px solid #1a1a1a; padding: 20px 28px; border-radius: 50px; transition: all 0.25s; text-align: left; text-decoration: none; }
        .btn-next:hover { border-color: #c8f135; box-shadow: 0 0 0 1px #c8f135, 0 4px 20px #c8f13520; background: #141414; }
        .btn-next-thumb { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; background: #1a1a1a; flex-shrink: 0; }
        .btn-next-thumb img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; }
        .btn-next-text { flex: 1; }
        .btn-next-label { color: #c8f135; font-family: var(--font-barlow-condensed), sans-serif; font-size: 11px; letter-spacing: 2px; margin-bottom: 4px; }
        .btn-next-title { color: white; font-family: var(--font-bebas), sans-serif; font-size: 28px; line-height: 1.0; }
        .btn-next-arrow { color: #c8f135; font-size: 28px; transition: transform 0.2s; flex-shrink: 0; }
        .btn-next:hover .btn-next-arrow { transform: translateX(6px); }
        .foot { border-top: 1px solid #1a1a1a; padding: 28px 0; }
        .foot-in { max-width: 1300px; margin: 0 auto; padding: 0 80px; display: flex; align-items: center; justify-content: space-between; }
        .flogo { display: flex; align-items: center; gap: 12px; }
        .fic { background: #c8f135; width: 32px; height: 32px; border-radius: 8px; overflow: hidden; }
        .fic img { width: 100%; height: 100%; object-fit: cover; }
        .fnm { font-family: var(--font-bebas), sans-serif; font-size: 16px; letter-spacing: 2px; }
        .fsub { color: #ccc; font-size: 17px; font-style: italic; font-weight: 400; margin-top: 6px; }
        .flinks { display: flex; gap: 28px; }
        .flink { color: #ddd; font-family: var(--font-barlow-condensed), sans-serif; font-size: 15px; letter-spacing: 1px; cursor: pointer; background: none; border: none; text-decoration: none; }
        .flink:hover { color: #c8f135; }
        .green-title-detail { font-size: 80px; }
        @media (max-width: 768px) {
          .navbar { padding: 10px 0; }
          .navbar-inner { padding: 0 16px; }
          .green-title-detail { font-size: 48px; }
          .detail-img-block { padding: 16px 16px 0; }
          .detail-img { height: 220px; border-radius: 10px; }
          .detail-article { padding: 28px 16px 0; }
          .detail-perex { font-size: 17px; margin-bottom: 32px; }
          .eline { padding: 0 16px 32px; }
          .bottom-actions { padding: 0 16px 48px; flex-direction: column; align-items: stretch; }
          .btn-back { justify-content: center; }
          .btn-next { border-radius: 16px; }
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

      <div className="detail-img-block">
        <div className="detail-img">
          {pikoska.obrazok
            ? <img src={urlFor(pikoska.obrazok)} alt={pikoska.nadpis} />
            : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />
          }
          <div className="detail-img-cat">{pikoska.kategoria}</div>
        </div>
      </div>

      <div className="detail-article">
        <GreenTitle nadpis={pikoska.nadpis} />
        <div className="detail-perex">{pikoska.perex}</div>
        <div>{renderObsah(pikoska.obsah)}</div>
      </div>

      <div className="eline"><hr /><span>KONIEC VEREJNÉHO SPISU</span><hr /></div>

      <div className="bottom-actions">
        <Link href="/" className="btn-back">← SPÄŤ DO ARCHÍVU</Link>
        {next && (
          <Link href={`/pikoska/${next.slug.current}`} className="btn-next">
            <div className="btn-next-thumb">
              {next.obrazok
                ? <img src={urlForThumb(next.obrazok)} alt={next.nadpis} loading="lazy" />
                : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />
              }
            </div>
            <div className="btn-next-text">
              <div className="btn-next-label">ĎALŠÍ SPIS</div>
              <div className="btn-next-title">{next.nadpis}</div>
            </div>
            <span className="btn-next-arrow">→</span>
          </Link>
        )}
      </div>

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

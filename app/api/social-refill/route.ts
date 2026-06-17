import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import Anthropic from '@anthropic-ai/sdk';

// Cron route – generuje carousel (IG + TikTok) z najbližších nepublikovaných
// pikošiek, naplánuje ich do Bufferu a označí ako publikované v Sanity.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PROJECT_ID = '74b6xpqc';
const DATASET = 'production';

const GREEN = '#c8f135';
const BG = '#0a0a0a';

const sanity = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});
const builder = imageUrlBuilder(sanity);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
});

// ---------------------------------------------------------------------------
// Typy
// ---------------------------------------------------------------------------
type Pikoska = {
  _id: string;
  nadpis: string;
  slug?: { current: string };
  kategoria: string;
  perex: string;
  obsah?: any[];
  obrazok?: any;
  datumPublikacie?: string;
};

type Copy = {
  hookRiadok: string;
  pribehKratky: string;
  otazkaKonca: string;
};

// ---------------------------------------------------------------------------
// satori "h" helper (súbor je .ts, nie .tsx) + typy
// ---------------------------------------------------------------------------
type VNode = { type: string; props: Record<string, any> };
function h(type: string, props: Record<string, any> | null, ...children: any[]): VNode {
  const p: Record<string, any> = { ...(props || {}) };
  if (children.length === 1) p.children = children[0];
  else if (children.length > 1) p.children = children;
  return { type, props: p };
}

// ---------------------------------------------------------------------------
// Fonty pre satori (Barlow, latin-ext kvôli slovenskej diakritike)
// ---------------------------------------------------------------------------
type FontDef = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: 'normal' };
let fontCache: FontDef[] | null = null;

async function loadFonts(): Promise<FontDef[]> {
  if (fontCache) return fontCache;
  const base = 'https://cdn.jsdelivr.net/npm/@fontsource/barlow@5.0.13/files';
  const targets: { url: string; weight: 400 | 600 | 700 }[] = [
    { url: `${base}/barlow-latin-ext-400-normal.woff`, weight: 400 },
    { url: `${base}/barlow-latin-ext-600-normal.woff`, weight: 600 },
    { url: `${base}/barlow-latin-ext-700-normal.woff`, weight: 700 },
  ];
  const fonts = await Promise.all(
    targets.map(async (t) => {
      const res = await fetch(t.url);
      if (!res.ok) throw new Error(`Font fetch failed: ${t.url} (${res.status})`);
      const data = await res.arrayBuffer();
      return { name: 'Barlow', data, weight: t.weight, style: 'normal' as const };
    })
  );
  fontCache = fonts;
  return fonts;
}

// ---------------------------------------------------------------------------
// Pomocné: text z Portable Text obsahu
// ---------------------------------------------------------------------------
function obsahToText(obsah?: any[]): string {
  if (!Array.isArray(obsah)) return '';
  return obsah
    .map((b) => (Array.isArray(b?.children) ? b.children.map((c: any) => c?.text || '').join('') : ''))
    .filter(Boolean)
    .join('\n');
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Zelené kľúčové slová – heuristika: čísla/roky a slová celé veľkými písmenami.
function isKeyword(word: string): boolean {
  const clean = word.replace(/[^0-9A-Za-zÀ-ž]/g, '');
  if (!clean) return false;
  if (/^\d+$/.test(clean)) return true;
  if (clean.length > 1 && clean === clean.toUpperCase() && /[A-ZÁ-Ž]/.test(clean)) return true;
  return false;
}

// Renderuje text po slovách s flex-wrap, kľúčové/posledná-veta slová zelené.
function wrappedWords(
  text: string,
  opts: { fontSize: number; weight: 400 | 600 | 700; greenSet?: Set<string>; greenAll?: boolean; lineHeight?: number }
): VNode {
  const words = text.split(/\s+/).filter(Boolean);
  const children = words.map((w) => {
    const green = opts.greenAll || (opts.greenSet ? opts.greenSet.has(w) : false) || isKeyword(w);
    return h(
      'div',
      {
        style: {
          display: 'flex',
          color: green ? GREEN : '#ffffff',
          fontWeight: opts.weight,
          fontSize: opts.fontSize,
          marginRight: Math.round(opts.fontSize * 0.28),
          lineHeight: opts.lineHeight ?? 1.25,
        },
      },
      w
    );
  });
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        width: '100%',
      },
    },
    ...children
  );
}

// ---------------------------------------------------------------------------
// Logo (zelený zaoblený rect 36x36 s čiernym diamantom + CURIOSITY LAB)
// ---------------------------------------------------------------------------
function logo(): VNode {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
      },
    },
    h(
      'div',
      {
        style: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: GREEN,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      h('div', {
        style: {
          width: 16,
          height: 16,
          backgroundColor: '#000000',
          transform: 'rotate(45deg)',
        },
      })
    ),
    h(
      'div',
      {
        style: {
          color: GREEN,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 4,
          display: 'flex',
        },
      },
      'CURIOSITY LAB'
    )
  );
}

function logoBar(): VNode {
  return h(
    'div',
    {
      style: {
        position: 'absolute',
        top: 60,
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      },
    },
    logo()
  );
}

// ---------------------------------------------------------------------------
// Stavba slidov
// ---------------------------------------------------------------------------
function slideBackgroundHook(hook: string, bgDataUri: string, w: number, h0: number): VNode {
  const sentences = splitSentences(hook);
  const last = sentences.length ? sentences[sentences.length - 1] : hook;
  const rest = sentences.slice(0, -1).join(' ');
  return h(
    'div',
    {
      style: {
        width: w,
        height: h0,
        display: 'flex',
        position: 'relative',
        backgroundColor: BG,
        backgroundImage: `url(${bgDataUri})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
    },
    // gradient overlay
    h('div', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage:
          'linear-gradient(180deg, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.0) 30%, rgba(10,10,10,0.8) 65%, rgba(10,10,10,1) 100%)',
      },
    }),
    logoBar(),
    // hook dole
    h(
      'div',
      {
        style: {
          position: 'absolute',
          bottom: 90,
          left: 70,
          right: 70,
          display: 'flex',
          flexDirection: 'column',
        },
      },
      rest
        ? h('div', { style: { display: 'flex', width: '100%', marginBottom: 8 } }, wrappedWords(rest, { fontSize: 52, weight: 700 }))
        : h('div', { style: { display: 'none' } }),
      h('div', { style: { display: 'flex', width: '100%' } }, wrappedWords(last, { fontSize: 52, weight: 700, greenAll: true }))
    )
  );
}

function slideMid(text: string, w: number, h0: number, yearPrefix?: string): VNode {
  const inner: VNode[] = [];
  if (yearPrefix) {
    inner.push(
      h(
        'div',
        {
          style: {
            color: GREEN,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 6,
            marginBottom: 28,
            display: 'flex',
          },
        },
        `ROK ${yearPrefix}`
      )
    );
  }
  inner.push(wrappedWords(text, { fontSize: 42, weight: 600, lineHeight: 1.35 }));
  return h(
    'div',
    {
      style: {
        width: w,
        height: h0,
        backgroundColor: BG,
        display: 'flex',
        position: 'relative',
      },
    },
    logoBar(),
    h(
      'div',
      {
        style: {
          position: 'absolute',
          top: 0,
          left: 70,
          right: 70,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        },
      },
      ...inner
    )
  );
}

function slideOutro(w: number, h0: number): VNode {
  return h(
    'div',
    {
      style: {
        width: w,
        height: h0,
        backgroundColor: BG,
        display: 'flex',
        position: 'relative',
      },
    },
    logoBar(),
    h(
      'div',
      {
        style: {
          position: 'absolute',
          top: 0,
          left: 70,
          right: 70,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      h('div', { style: { color: '#ffffff', fontSize: 40, fontWeight: 400, display: 'flex' } }, 'Každý deň jeden'),
      h('div', { style: { color: GREEN, fontSize: 44, fontWeight: 700, display: 'flex', marginTop: 4 } }, 'zabudnutý fakt'),
      h('div', { style: { color: '#ffffff', fontSize: 44, fontWeight: 700, display: 'flex', marginTop: 4 } }, 'z histórie.'),
      h('div', { style: { color: GREEN, fontSize: 48, display: 'flex', marginTop: 36, marginBottom: 36 } }, '↓'),
      h(
        'div',
        {
          style: {
            backgroundColor: GREEN,
            color: '#000000',
            fontSize: 34,
            fontWeight: 700,
            padding: '16px 36px',
            borderRadius: 50,
            display: 'flex',
          },
        },
        'www.curiositylab.sk'
      ),
      h('div', { style: { color: '#ffffff', fontSize: 32, fontWeight: 400, display: 'flex', marginTop: 24 } }, 'link v bio')
    )
  );
}

// ---------------------------------------------------------------------------
// Render VNode -> PNG buffer
// ---------------------------------------------------------------------------
async function renderPng(node: VNode, w: number, h0: number, fonts: FontDef[]): Promise<Buffer> {
  const svg = await satori(node as any, {
    width: w,
    height: h0,
    fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: w } });
  return Buffer.from(resvg.render().asPng());
}

// Stiahne Sanity obrázok a sharpom oreže na rozmer slidu (cover) -> data URI.
async function backgroundDataUri(obrazok: any, w: number, h0: number): Promise<string> {
  const url = builder.image(obrazok).width(w).height(h0).fit('crop').auto('format').url();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity image fetch failed (${res.status})`);
  const input = Buffer.from(await res.arrayBuffer());
  const png = await sharp(input).resize(w, h0, { fit: 'cover', position: 'centre' }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function buildCarousel(
  pik: Pikoska,
  copy: Copy,
  fonts: FontDef[],
  dims: { w: number; h: number }
): Promise<Buffer[]> {
  const { w, h: ht } = dims;
  const year = (pik.datumPublikacie || '').slice(0, 4) || '';

  // Rozdelenie príbehu do 3 slidov (2–4)
  const sentences = splitSentences(copy.pribehKratky);
  const chunks: string[] = ['', '', ''];
  sentences.forEach((s, i) => {
    chunks[Math.min(2, Math.floor((i * 3) / Math.max(1, sentences.length)))] += (chunks[Math.min(2, Math.floor((i * 3) / Math.max(1, sentences.length)))] ? ' ' : '') + s;
  });
  if (!chunks[0]) chunks[0] = copy.pribehKratky;

  const bg = await backgroundDataUri(pik.obrazok, w, ht);

  const slides: VNode[] = [
    slideBackgroundHook(copy.hookRiadok, bg, w, ht),
    slideMid(chunks[0] || copy.pribehKratky, w, ht, year),
    slideMid(chunks[1] || copy.otazkaKonca, w, ht),
    slideMid(chunks[2] || copy.otazkaKonca, w, ht),
    slideOutro(w, ht),
  ];

  const pngs: Buffer[] = [];
  for (const s of slides) pngs.push(await renderPng(s, w, ht, fonts));
  return pngs;
}

// ---------------------------------------------------------------------------
// Caption + hashtagy
// ---------------------------------------------------------------------------
const CATEGORY_HASHTAG: Record<string, string> = {
  STAROVEK: '#starovek',
  STREDOVEK: '#stredovek',
  MODERNA: '#modernahistoria',
  VEDA: '#veda',
  'MEDICÍNA': '#medicina',
  VOJENSTVO: '#vojenstvo',
  'KRÁĽOVSTVO': '#kralovstvo',
  KULTÚRA: '#kultura',
};

const SENSITIVE = [
  'heroin', 'heroín', 'drogy', 'drug', 'vibrator', 'vibrátor', 'sex', 'prostitúcia',
  'nacizmus', 'hitler', 'stalin', 'alkohol', 'opium', 'morfín', 'kokaín', 'mučenie',
  'samovražda',
];

function buildHashtags(pik: Pikoska): string {
  const fixed = '#historia #zaujimavosti #fakty #vedelisteze';
  const probe = `${pik.nadpis || ''} ${pik.kategoria || ''}`.toLowerCase();
  const sensitive = SENSITIVE.some((wd) => probe.includes(wd.toLowerCase()));
  const specific = sensitive ? '#medicina' : (CATEGORY_HASHTAG[(pik.kategoria || '').toUpperCase()] || '#historia');
  return `${fixed} ${specific} #pikoska #curiositylab`;
}

function buildCaption(copy: Copy, pik: Pikoska): string {
  return (
    `${copy.hookRiadok}\n\n${copy.pribehKratky}\n\n${copy.otazkaKonca}\n\n—\n` +
    `📍 curiositylab.sk (link v bio)\n\n${buildHashtags(pik)}`
  );
}

// ---------------------------------------------------------------------------
// Anthropic copy
// ---------------------------------------------------------------------------
async function generateCopy(pik: Pikoska): Promise<Copy> {
  const obsah = obsahToText(pik.obsah).slice(0, 4000);
  const userPrompt =
    'Na základe tejto pikošky vygeneruj JSON s poľami hookRiadok (1 šokujúca veta ktorá NESMIE prezradiť pointu), ' +
    'pribehKratky (2-3 vety príbehu), otazkaKonca (1 provokatívna otázka pre komentáre). ' +
    `Pikoška: názov=${pik.nadpis}, perex=${pik.perex}, obsah=${obsah}. Odpovedz LEN JSON, nič iné.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userPrompt }],
    system:
      'Si copywriter pre historický edukačný TikTok a Instagram účet Curiosity Lab. Píš po slovensky. Buď stručný a dramatický.',
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonText = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start = jsonText.indexOf('{');
  const end = jsonText.lastIndexOf('}');
  const parsed = JSON.parse(jsonText.slice(start, end + 1));
  return {
    hookRiadok: String(parsed.hookRiadok || '').trim(),
    pribehKratky: String(parsed.pribehKratky || '').trim(),
    otazkaKonca: String(parsed.otazkaKonca || '').trim(),
  };
}

// ---------------------------------------------------------------------------
// Buffer naplánovanie
// ---------------------------------------------------------------------------
function scheduledAt(datum: string | undefined, hh: number, mm: number): string {
  const d = (datum || new Date().toISOString()).slice(0, 10);
  const [y, m, day] = d.split('-').map(Number);
  const tz = 'Europe/Bratislava';
  const offsetMinutes = (instant: number) => {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = dtf.formatToParts(new Date(instant)).reduce((a: Record<string, string>, p) => {
      a[p.type] = p.value;
      return a;
    }, {});
    const asUTC = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    return (asUTC - instant) / 60000;
  };
  let utc = Date.UTC(y, m - 1, day, hh, mm, 0);
  let off = offsetMinutes(utc);
  utc = Date.UTC(y, m - 1, day, hh, mm, 0) - off * 60000;
  off = offsetMinutes(utc);
  const instant = Date.UTC(y, m - 1, day, hh, mm, 0) - off * 60000;
  return new Date(instant).toISOString();
}

async function postToBuffer(params: {
  channelId: string;
  caption: string;
  slides: Buffer[];
  scheduledAt: string;
}): Promise<any> {
  const body = new URLSearchParams();
  body.append('profile_ids[]', params.channelId);
  body.append('text', params.caption);
  body.append('scheduled_at', params.scheduledAt);
  // prvý slide ako hlavné foto
  body.append('media[photo]', `data:image/png;base64,${params.slides[0].toString('base64')}`);
  // všetkých 5 slidov ako carousel
  params.slides.forEach((b, i) => {
    body.append(`media[photo[${i}]]`, `data:image/png;base64,${b.toString('base64')}`);
  });

  const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.BUFFER_API_KEY || ''}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Buffer API ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

// ---------------------------------------------------------------------------
// Sanity označenie publikované
// ---------------------------------------------------------------------------
async function markPublished(id: string): Promise<void> {
  const res = await fetch(
    `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.SANITY_WRITE_TOKEN || ''}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ mutations: [{ patch: { id, set: { publikovaneSocial: true } } }] }),
    }
  );
  if (!res.ok) throw new Error(`Sanity mutate ${res.status}: ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
async function run() {
  // Hobby plán má limit 60 s na funkciu – spracujeme 1 pikošku na beh.
  // Cron beží denne, takže fronta sa postupne vyprázdni.
  const pikosky: Pikoska[] = await sanity.fetch(
    `*[_type == "pikoska" && datumPublikacie <= now() && publikovaneSocial != true]
      | order(datumPublikacie asc)[0...1]{
        _id, nadpis, slug, kategoria, perex, obsah, obrazok, datumPublikacie
      }`
  );

  if (!pikosky.length) {
    return { ok: true, processed: 0, message: 'Žiadne pikošky na publikovanie.' };
  }

  const fonts = await loadFonts();
  const results: any[] = [];

  for (const pik of pikosky) {
    try {
      const copy = await generateCopy(pik);

      const igSlides = await buildCarousel(pik, copy, fonts, { w: 1080, h: 1350 });
      const ttSlides = await buildCarousel(pik, copy, fonts, { w: 1080, h: 1920 });

      const caption = buildCaption(copy, pik);

      const igChannel = process.env.BUFFER_CHANNEL_IG || '';
      const ttChannel = process.env.BUFFER_CHANNEL_TIKTOK || '';

      const buffer: any = {};
      if (igChannel) {
        buffer.ig = await postToBuffer({
          channelId: igChannel,
          caption,
          slides: igSlides,
          scheduledAt: scheduledAt(pik.datumPublikacie, 19, 0),
        });
      }
      if (ttChannel) {
        buffer.tiktok = await postToBuffer({
          channelId: ttChannel,
          caption,
          slides: ttSlides,
          scheduledAt: scheduledAt(pik.datumPublikacie, 18, 30),
        });
      }

      await markPublished(pik._id);

      results.push({ id: pik._id, nadpis: pik.nadpis, ok: true });
    } catch (err: any) {
      results.push({ id: pik._id, nadpis: pik.nadpis, ok: false, error: err?.message || String(err) });
    }
  }

  return { ok: true, processed: results.length, results };
}

export async function GET() {
  try {
    const out = await run();
    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}

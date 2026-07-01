import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import Anthropic from '@anthropic-ai/sdk';
import { put } from '@vercel/blob';

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

// Claude Opus 4.8 píše copy (silnejší ako Gemini Flash na hooky, slovenčinu a pravidlá).
// SDK sám opakuje pri 429/529/5xx (maxRetries).
const anthropic = new Anthropic({ apiKey: (process.env.ANTHROPIC_API_KEY || '').trim(), maxRetries: 4 });
const COPY_MODEL = 'claude-opus-4-8';
const SYSTEM_PROMPT =
  'Si copywriter pre historický edukačný TikTok a Instagram účet Curiosity Lab. Píš po slovensky. Buď stručný a dramatický.\n' +
  '\n' +
  'PRAVIDLÁ HLASU (vždy platné, nemenné):\n' +
  '- Nikdy neznieš ako AI. Žiadny korporátny, uhladený ani robotický tón. Píš ako reálny človek, čo rozpráva dobrú historku.\n' +
  '- Žiadne pomlčky (—). Použi čiarku, bodku alebo vetu preformuluj.\n' +
  '- Žiadne vatové frázy ("je dôležité poznamenať", "v dnešnej uponáhľanej dobe", "poďme sa pozrieť", "predstavte si").\n' +
  '- Žiadne generické AI vzory (rovnako stavané vety za sebou, zoznamy troch vecí s identickou stavbou).\n' +
  '- Krátke, úderné vety. Konkrétne detaily (mená, čísla, roky) namiesto všeobecností.\n' +
  '- Každá veta je gramaticky ÚPLNÁ a správna (má sloveso). Žiadne telegrafické útržky ani visiace prístavky.\n' +
  '- ZVRATNÉ SLOVESÁ: nikdy nevynechaj "sa" ani "si" (napr. "pila sa káva", NIE "pila káva"; "umývali si ruky", NIE "umývali ruky"). Toto je najčastejšia slovenská chyba — kontroluj každú vetu.\n' +
  '- Dodržuj slovenskú interpunkciu. POZOR: pred spojkou "alebo" pri rovnocenných možnostiach (A alebo B) sa čiarka NEPÍŠE — správne "pomsta alebo monštrum", NIE "pomsta, alebo monštrum".\n' +
  '- Máš osobnosť. Buď priamy. Znej ako pútavý rozprávač, nie ako jazykový model.';

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
  hookFakt: string;     // slide 1, veta 1 — biela: šokujúci fakt (neprezradí pointu)
  hookSlucka: string;   // slide 1, veta 2 — zelená: otvorená slučka, BEZ pointy
  rok: string;          // slide 2 štítok "ROK ..." (napr. 1232 alebo 2560 PRED N. L.); môže byť prázdne
  pribeh: string;       // slide 2 — kto/čo urobil (1-2 vety)
  eskalacia: string;    // slide 3 — čo sa stalo ďalej, kauzálna reťaz (1-2 vety)
  pointa: string;       // slide 4 — twist / zapamätateľná bodka (1-2 vety)
  otazkaKonca: string;  // do popisu — provokatívna otázka
  klucoveSlova: string[];
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
type FontDef = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700 | 800; style: 'normal' };
let fontCache: FontDef[] | null = null;

async function loadFonts(): Promise<FontDef[]> {
  if (fontCache) return fontCache;
  // Satori potrebuje ttf/otf (nie woff/woff2). @fontsource ttf nepublikuje,
  // preto berieme plné TTF s latin-ext glyfmi (slovenská diakritika) z google/fonts.
  // Barlow = hook/príbeh, Barlow Condensed = logo, ROK, pill, link v bio.
  const base = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/barlow';
  const baseCond = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/barlowcondensed';
  const targets: { name: string; url: string; weight: 400 | 600 | 700 | 800 }[] = [
    { name: 'Barlow', url: `${base}/Barlow-Regular.ttf`, weight: 400 },
    { name: 'Barlow', url: `${base}/Barlow-SemiBold.ttf`, weight: 600 },
    { name: 'Barlow', url: `${base}/Barlow-Bold.ttf`, weight: 700 },
    { name: 'Barlow', url: `${base}/Barlow-ExtraBold.ttf`, weight: 800 },
    { name: 'Barlow Condensed', url: `${baseCond}/BarlowCondensed-Bold.ttf`, weight: 700 },
  ];
  const fonts = await Promise.all(
    targets.map(async (t) => {
      const res = await fetch(t.url);
      if (!res.ok) throw new Error(`Font fetch failed: ${t.url} (${res.status})`);
      const data = await res.arrayBuffer();
      return { name: t.name, data, weight: t.weight, style: 'normal' as const };
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
  const raw = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Zlúč späť falošné hranice po skratkách – rímske číslice (Gregor IX.) a iniciály (J. F.).
  const out: string[] = [];
  for (const s of raw) {
    if (out.length && /(?:^|\s)([IVXLCDM]{1,4}|[A-ZÁ-Ž])\.$/.test(out[out.length - 1])) {
      out[out.length - 1] += ' ' + s;
    } else {
      out.push(s);
    }
  }
  return out;
}

// Zelené kľúčové slová – heuristika: čísla/roky a slová celé veľkými písmenami.
function isKeyword(word: string): boolean {
  const clean = word.replace(/[^0-9A-Za-zÀ-ž]/g, '');
  if (!clean) return false;
  if (/^\d+$/.test(clean)) return true;
  if (clean.length > 1 && clean === clean.toUpperCase() && /[A-ZÁ-Ž]/.test(clean)) return true;
  return false;
}

// Normalizácia slova na porovnanie s kľúčovými slovami (bez interpunkcie, malé písmená).
function normalizeWord(word: string): string {
  return word.replace(/[^0-9A-Za-zÀ-ž]/g, '').toLowerCase();
}

// Zo zoznamu kľúčových slov/fráz (od Gemini) spraví Set jednotlivých slov na zvýraznenie.
function buildGreenSet(keywords: string[]): Set<string> {
  const set = new Set<string>();
  for (const phrase of keywords) {
    for (const w of phrase.split(/\s+/)) {
      const n = normalizeWord(w);
      if (n.length > 1) set.add(n);
    }
  }
  return set;
}

// Rozseká text na tokeny – kľúčové frázy (od Gemini) ostávajú ako celok
// (jeden token = nezalomí sa, napr. "25 miliónov" drží na jednom riadku).
type Token = { text: string; green: boolean };
function tokenize(text: string, phrases: string[]): Token[] {
  const clean = (phrases || []).map((p) => p.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!clean.length) return text.split(/\s+/).filter(Boolean).map((w) => ({ text: w, green: false }));
  const esc = clean.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('(?<![0-9A-Za-zÀ-ž])(?:' + esc.join('|') + ')[.,!?;:]*(?![0-9A-Za-zÀ-ž])', 'giu');
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    for (const w of text.slice(last, m.index).split(/\s+/)) if (w) out.push({ text: w, green: false });
    out.push({ text: m[0], green: true });
    last = m.index + m[0].length;
  }
  for (const w of text.slice(last).split(/\s+/)) if (w) out.push({ text: w, green: false });
  return out;
}

// Renderuje text po tokenoch s flex-wrap, kľúčové slová/frázy zelené a tučné.
function wrappedWords(
  text: string,
  opts: { fontSize: number; weight: 400 | 600 | 700 | 800; greenSet?: Set<string>; greenPhrases?: string[]; greenAll?: boolean; lineHeight?: number; baseColor?: string; disableKeyword?: boolean; ensureGreen?: boolean; center?: boolean }
): VNode {
  const tokens = tokenize(text, opts.greenPhrases || []);
  const greens = tokens.map((t) => {
    const n = normalizeWord(t.text);
    return opts.greenAll || t.green || (opts.greenSet ? opts.greenSet.has(n) : false) || (!opts.disableKeyword && isKeyword(t.text));
  });
  // Záruka aspoň 1 zeleného slova v tomto bloku (napr. prvá veta hooku nesmie ostať bez zvýraznenia).
  if (opts.ensureGreen && !greens.some(Boolean)) {
    const STOP = new Set(['a','aj','ako','ale','bez','bol','bola','boli','bolo','do','ich','je','keď','ktorá','ktoré','ktorí','na','nad','nie','možno','nikdy','o','od','po','pod','pre','pri','sa','si','so','tak','to','tou','už','v','vo','za','zo','že',
      // bežné slovesá – nech ensureGreen radšej vyberie podstatné meno než sloveso
      'urobili','urobil','spravili','vypili','vypil','postavili','postavil','dostali','dostal','dostávali','nedali','mali','majú','stalo','stali','začali','prišli','povedal','spôsobil','spôsobili','dovtedy','niečo','všetko']);
    let bestIdx = -1; let bestLen = 0;
    tokens.forEach((t, i) => {
      if (/\s/.test(t.text)) return;
      const n = normalizeWord(t.text);
      if (n.length > bestLen && n.length > 3 && !STOP.has(n)) { bestLen = n.length; bestIdx = i; }
    });
    if (bestIdx >= 0) greens[bestIdx] = true;
  }
  const mr = Math.round(opts.fontSize * 0.28);
  const rt = (i: number): VNode => {
    const t = tokens[i];
    const green = greens[i];
    const multiWord = /\s/.test(t.text);
    return h(
      'div',
      {
        style: {
          display: 'flex',
          // viacslovná fráza sa nezalomí (drží na jednom riadku)
          whiteSpace: multiWord ? 'nowrap' : 'normal',
          color: green ? GREEN : (opts.baseColor ?? '#ffffff'),
          // zelené kľúčové slová sú aj tučnejšie, aby vyskočili
          fontWeight: green ? 800 : opts.weight,
          fontSize: opts.fontSize,
          marginRight: mr,
          lineHeight: opts.lineHeight ?? 1.25,
        },
      },
      t.text
    );
  };
  // Slovenská typografia: krátke predložky/spojky (a, na, za, v, do…) sa NESMÚ lámať
  // samé na koniec riadka — zlepia sa s nasledujúcim slovom do nezalomiteľnej skupiny.
  const PREP = new Set(['a', 'aj', 'i', 'k', 'o', 's', 'u', 'v', 'z', 'do', 'na', 'za', 'zo', 'so', 'vo', 'ku', 'po', 'od', 'pri', 'pre', 'nad', 'pod', 'bez']);
  const children: VNode[] = [];
  let gi = 0;
  while (gi < tokens.length) {
    const t = tokens[gi];
    const isPrep = !/\s/.test(t.text) && PREP.has(normalizeWord(t.text));
    if (isPrep && gi + 1 < tokens.length) {
      children.push(
        h('div', { style: { display: 'flex', flexWrap: 'nowrap', alignItems: 'flex-start' } }, rt(gi), rt(gi + 1))
      );
      gi += 2;
    } else {
      children.push(rt(gi));
      gi += 1;
    }
  }
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: opts.center ? 'center' : 'flex-start',
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
        gap: 27,
      },
    },
    h(
      'div',
      {
        style: {
          width: 97,
          height: 97,
          borderRadius: 27,
          backgroundColor: GREEN,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      // dutý (outlined) diamant – iba čierny rámik, stred priehľadný
      h('div', {
        style: {
          width: 32,
          height: 32,
          border: '8px solid #0a0a0a',
          transform: 'rotate(45deg)',
        },
      })
    ),
    h(
      'div',
      {
        style: {
          color: '#ffffff',
          fontFamily: 'Barlow Condensed',
          fontSize: 49,
          fontWeight: 700,
          letterSpacing: 16,
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
        top: '5%',
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      },
    },
    logo()
  );
}

// Emblém: prázdny kosoštvorec + zelené čiarky do strán (———◇———).
// Jednotný značkový znak na všetkých slidoch (slide 1 v strede, 2-4 hore).
// scale = pomer (1 = základ); čiarky sa von plynulo strácajú do priehľadna.
function emblem(scale = 1): VNode {
  const d = Math.round(34 * scale);
  const bw = Math.max(4, Math.round(6 * scale));
  const lineW = Math.round(170 * scale);
  const lineH = Math.max(2, Math.round(3 * scale));
  const gap = Math.round(26 * scale);
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    h('div', {
      style: {
        width: lineW,
        height: lineH,
        marginRight: gap,
        display: 'flex',
        backgroundImage: `linear-gradient(90deg, rgba(200,241,53,0) 0%, ${GREEN} 100%)`,
      },
    }),
    h('div', {
      style: {
        width: d,
        height: d,
        border: `${bw}px solid ${GREEN}`,
        transform: 'rotate(45deg)',
        display: 'flex',
      },
    }),
    h('div', {
      style: {
        width: lineW,
        height: lineH,
        marginLeft: gap,
        display: 'flex',
        backgroundImage: `linear-gradient(90deg, ${GREEN} 0%, rgba(200,241,53,0) 100%)`,
      },
    })
  );
}

// Jednotná veľkosť loga (menšie). 1 = pôvodné; 0.72 = aktuálne menšie všade.
const LOGO_SCALE = 0.72;

// Logo: kosoštvorec s CURIOSITY LAB vnútri (BEZ čiarok). Jednotný znak na slidoch 2-4
// (nad textom) a na outre (nižšie). So zeleným glow + malým kosoštvorcom navrchu.
function logoMark(scale: number = LOGO_SCALE): VNode {
  const S = Math.round(132 * scale);          // strana štvorca (po rotácii = kosoštvorec)
  const box = Math.round(S * 1.4142);         // bounding box po rotácii 45°
  const off = Math.round((box - S) / 2);
  const bw = Math.max(2, Math.round(3 * scale));
  const dia = Math.round(16 * scale);
  const fs = Math.round(24 * scale);
  const ls = Math.max(2, Math.round(5 * scale));
  const mb = Math.round(12 * scale);
  const glow = Math.round(26 * scale);
  return h(
    'div',
    { style: { position: 'relative', width: box, height: box, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    h('div', { style: { position: 'absolute', top: off, left: off, width: S, height: S, border: `${bw}px solid ${GREEN}`, transform: 'rotate(45deg)', display: 'flex', boxShadow: `0 0 ${glow}px rgba(200,241,53,0.55)` } }),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
      h('div', { style: { width: dia, height: dia, border: `${bw}px solid ${GREEN}`, transform: 'rotate(45deg)', display: 'flex', marginBottom: mb } }),
      h('div', { style: { color: '#ffffff', fontFamily: 'Barlow Condensed', fontSize: fs, fontWeight: 700, letterSpacing: ls, lineHeight: 1.1, display: 'flex' } }, 'CURIOSITY'),
      h('div', { style: { color: '#ffffff', fontFamily: 'Barlow Condensed', fontSize: fs, fontWeight: 700, letterSpacing: ls, lineHeight: 1.1, display: 'flex' } }, 'LAB')
    )
  );
}

// Logo s deliacou čiarou cez celú šírku (———◇———) — LEN na slide 1 (na horizonte fotky).
// Čiary idú od kraja po kraj (flexGrow) a strácajú sa do priehľadna pri logu/krajoch.
function emblemLabeled(scale: number = LOGO_SCALE): VNode {
  const gap = 20, lineH = 2;
  return h(
    'div',
    { style: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center' } },
    h('div', { style: { flexGrow: 1, height: lineH, marginRight: gap, display: 'flex', backgroundImage: `linear-gradient(90deg, rgba(200,241,53,0) 0%, ${GREEN} 100%)` } }),
    logoMark(scale),
    h('div', { style: { flexGrow: 1, height: lineH, marginLeft: gap, display: 'flex', backgroundImage: `linear-gradient(90deg, ${GREEN} 0%, rgba(200,241,53,0) 100%)` } })
  );
}

// ---------------------------------------------------------------------------
// Stavba slidov
// ---------------------------------------------------------------------------
// Odhad počtu riadkov textu pri danej veľkosti písma (zóna široká 908 px = 1080 - 2*86).
function estTextLines(txt: string, fs: number, innerW = 908): number {
  if (!txt) return 0;
  const cpl = Math.max(6, Math.floor(innerW / (fs * 0.56)));
  return Math.max(1, Math.ceil(txt.length / cpl));
}
// Zmestí sa hook (fakt + slučka) do 3 riadkov pri VEĽKOM fonte (68)?
// Pri 68 vyzerá hook ako hrdina; ak sa nezmestí, regenerujeme kratší.
function hookFitsThreeLines(fakt: string, slucka: string): boolean {
  return estTextLines(fakt, 68) + estTextLines(slucka, 68) <= 3;
}

function slideBackgroundHook(fakt: string, slucka: string, keywords: string[] | undefined, bgDataUri: string, w: number, h0: number): VNode {
  // Slide 1: obe vety biele, zelené sú LEN kľúčové slová (ako na ostatných slidoch).
  // Ak chýba jedna časť, zobrazí sa len druhá.
  const greenSet = keywords ? buildGreenSet(keywords) : undefined;
  const numericPhrases = (keywords || []).filter((p) => /\d/.test(p));
  // Oba hook texty rovnaký font. Auto-fit: spolu max 3 riadky.
  let fsHook = 96;
  for (const c of [96, 88, 80, 72]) { fsHook = c; if (estTextLines(fakt, c) + estTextLines(slucka, c) <= 3) break; }
  const isTT = h0 >= 1800;
  const pad = 130;
  const logoTop = isTT ? '42%' : '49%';
  const gradStop = isTT ? '60%' : '46%';
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
    // gradient — číri navrchu (vidno foto), začína tmavnúť pri logu
    h('div', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage:
          `linear-gradient(180deg, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.0) 15%, rgba(10,10,10,0.5) 36%, rgba(10,10,10,0.95) ${gradStop}, rgba(10,10,10,1.0) 70%)`,
      },
    }),
    h('div', { style: { position: 'absolute', top: logoTop, left: pad, right: pad, display: 'flex' } }, emblemLabeled()),
    h('div', {
        style: {
          position: 'absolute',
          bottom: isTT ? '26%' : '14%',
          left: pad,
          right: pad,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        },
      },
      fakt
        ? h('div', { style: { display: 'flex', width: '100%', marginBottom: 20 } },
            wrappedWords(fakt, { fontSize: fsHook, weight: 800, lineHeight: 1.25, baseColor: '#ffffff', greenSet, greenPhrases: numericPhrases, ensureGreen: true, center: true }))
        : h('div', { style: { display: 'none' } }),
      slucka
        ? h('div', { style: { display: 'flex', width: '100%' } },
            wrappedWords(slucka, { fontSize: fsHook, weight: 800, lineHeight: 1.25, baseColor: '#ffffff', greenSet, greenPhrases: numericPhrases, ensureGreen: true, center: true }))
        : h('div', { style: { display: 'none' } })
    )
  );
}

function slideMid(text: string, w: number, h0: number, keywords?: string[], yearPrefix?: string, bgDataUri?: string): VNode {
  const greenSet = keywords ? buildGreenSet(keywords) : undefined;
  const inner: VNode[] = [];
  if (yearPrefix) {
    inner.push(
      h(
        'div',
        {
          style: {
            fontFamily: 'Barlow Condensed',
            color: GREEN,
            fontSize: 49,
            fontWeight: 700,
            letterSpacing: 16,
            display: 'flex',
            width: '100%',
            justifyContent: 'center',
          },
        },
        `ROK ${yearPrefix}`
      )
    );
  }
  // Každá veta = vlastný riadok (.body), kľúčové slová zelené.
  // Nezalomiteľné (jeden token) sú LEN frázy s číslom (napr. "25 miliónov mŕtvych").
  // Slovné frázy (mená/miesta) sa zalomia prirodzene po slovách, ale ostanú zelené.
  const numericPhrases = (keywords || []).filter((p) => /\d/.test(p));
  const lines = splitSentences(text);
  const bodyLines = lines.length ? lines : [text];
  // Jednotná veľkosť na slidoch 2-4 (rovnaký font). Zmenší sa LEN pri extrémne dlhom
  // texte ako poistka proti pretečeniu (vtedy je text aj tak príliš dlhý).
  const bodyFs = text.length > 230 ? 56 : 64;
  for (const ln of bodyLines) {
    inner.push(
      h('div', { style: { display: 'flex', width: '100%' } }, wrappedWords(ln, { fontSize: bodyFs, weight: 700, lineHeight: 1.55, baseColor: '#eeeeee', greenSet, greenPhrases: numericPhrases, ensureGreen: true, center: true}))
    );
  }
  const children: VNode[] = [];
  // Jemná fotka na pozadí (rovnaká ako na slide 1) + silné stmavenie kvôli čitateľnosti.
  if (bgDataUri) {
    children.push(
      h('div', {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundImage: 'linear-gradient(180deg, rgba(10,10,10,0.78) 0%, rgba(10,10,10,0.88) 100%)',
        },
      })
    );
  }
  // logo znak NAD textom (rovnaké ako outro, bez čiarok; nie úplne hore — inak by ho orezalo UI appky)
  inner.unshift(
    h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 4 } },
      logoMark()
    )
  );
  children.push(
    h(
      'div',
      {
        style: {
          position: 'absolute',
          top: '18%',
          left: 86,
          right: 86,
          height: '58%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 44,
        },
      },
      ...inner
    )
  );
  return h(
    'div',
    {
      style: {
        width: w,
        height: h0,
        backgroundColor: BG,
        display: 'flex',
        position: 'relative',
        backgroundImage: bgDataUri ? `url(${bgDataUri})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
    },
    ...children
  );
}

// Šípka dole – ako SVG obrázok (Barlow nemá glyf „↓"), so zeleným glow.
const ARROW_DATA_URI = (() => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="64" viewBox="0 0 56 64">` +
    `<defs><filter id="g" x="-60%" y="-60%" width="220%" height="220%">` +
    `<feGaussianBlur stdDeviation="4" result="b"/>` +
    `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
    `<g filter="url(#g)" stroke="${GREEN}" stroke-width="6" stroke-linecap="round" ` +
    `stroke-linejoin="round" fill="none">` +
    `<line x1="28" y1="8" x2="28" y2="48"/><polyline points="12,34 28,52 44,34"/></g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
})();

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
    h(
      'div',
      {
        style: {
          position: 'absolute',
          top: 0,
          left: 86,
          right: 86,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 54,
        },
      },
      logoMark(),
      // hlavná veta – 2 riadky tesne pri sebe (jeden logický celok)
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
        h('div', { style: { color: '#ffffff', fontSize: 78, fontWeight: 800, lineHeight: 1.25, display: 'flex' } }, 'Chceš viac'),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'row' } },
          h('div', { style: { color: GREEN, fontSize: 78, fontWeight: 800, lineHeight: 1.25, display: 'flex', marginRight: 20 } }, 'zabudnutých'),
          h('div', { style: { color: '#ffffff', fontSize: 78, fontWeight: 800, lineHeight: 1.25, display: 'flex' } }, 'faktov?')
        )
      ),
      // zelená šípka s glow (SVG, Barlow nemá glyf ↓)
      h('img', { src: ARROW_DATA_URI, width: 84, height: 96, style: { display: 'flex' } }),
      // zelený pill
      h(
        'div',
        {
          style: {
            backgroundColor: GREEN,
            color: '#000000',
            fontFamily: 'Barlow Condensed',
            fontSize: 54,
            fontWeight: 700,
            padding: '32px 86px',
            borderRadius: 50,
            display: 'flex',
          },
        },
        'www.curiositylab.sk'
      ),
      h('div', { style: { color: '#ffffff', fontFamily: 'Barlow Condensed', fontSize: 54, fontWeight: 700, display: 'flex' } }, 'link v bio')
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

  const bg = await backgroundDataUri(pik.obrazok, w, ht);
  const kw = copy.klucoveSlova;

  // Každý slide má svoj zámer (podľa štruktúry): hook → príbeh → eskalácia → pointa → promo.
  const slides: VNode[] = [
    slideBackgroundHook(copy.hookFakt, copy.hookSlucka, kw, bg, w, ht),
    slideMid(copy.pribeh, w, ht, kw, copy.rok || undefined, bg),
    slideMid(copy.eskalacia, w, ht, kw, undefined, bg),
    slideMid(copy.pointa, w, ht, kw, undefined, bg),
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
  // Krátky caption: príbeh je v slidoch, popis nech ho NEduplikuje.
  // Hook (zastaví scroll) + výzva swipnúť + otázka (komentáre) + link + hashtagy.
  const hook = [copy.hookFakt, copy.hookSlucka].filter(Boolean).join(' ');
  return (
    `${hook} 🔥\n\n${copy.otazkaKonca} 👇\n\n` +
    `📖 Celú pikošku si prečítaš na curiositylab.sk — link v bio\n\n${buildHashtags(pik)}`
  );
}

// ---------------------------------------------------------------------------
// Claude copy
// ---------------------------------------------------------------------------
// Zavolá Claude Opus s naším system promptom a vráti text odpovede.
// SDK sám opakuje pri 429/529/5xx (maxRetries na klientovi).
async function generateWithRetry(prompt: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: COPY_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });
  const first = msg.content.find((b) => b.type === 'text');
  return first && first.type === 'text' ? first.text : '';
}

async function generateCopy(pik: Pikoska): Promise<Copy> {
  const obsah = obsahToText(pik.obsah).slice(0, 4000);
  const userPrompt =
    'Vygeneruj JSON pre 5-slidový carousel podľa pevnej štruktúry.\n' +
    '\n' +
    '⚡ NAJDÔLEŽITEJŠÍ JE HOOK (slide 1). Rozhoduje, či to vôbec niekto pozrie. Musí byť EXTRÉMNE silný — zastaviť scroll do 1 sekundy. Na hook daj najviac úsilia.\n' +
    'Remeslo hooku — vytvor INFORMAČNÚ MEDZERU (curiosity gap): povedz dosť, aby to šokovalo, ale zataj to hlavné, aby divák MUSEL swipnúť. Techniky: paradox, zakázané/tajné, šokujúce číslo, nečakaná príčina-následok (s utajeným následkom).\n' +
    'HOOK NESMIE: prezradiť pointu/twist, byť plochá otázka ("Prečo...?"), byť opisný či nudný, znieť ako učebnica.\n' +
    'PRÍKLADY SILNÝCH hookov (napodobni štýl, NIE obsah):\n' +
    '  • fakt="Pápež raz nariadil vyhubiť všetky mačky." slučka="Netušil, akú katastrofu tým spustí."\n' +
    '  • fakt="Najkratšia vojna v dejinách trvala 38 minút." slučka="A skončila skôr, než si nepriateľ stihol dať kávu."\n' +
    '  • fakt="Jeden muž prežil dve atómové bomby." slučka="A to, čo urobil potom, je ešte neuveriteľnejšie."\n' +
    'SLABÉ hooky (NIKDY NEROB): "Pyramídy stavali vďaka pivu." (prezradí pointu), "Prečo pili pivo?" (plochá otázka), "Denná mzda bola tekutá a výživná." (nudný opis).\n' +
    '\n' +
    '✅ PRAVDIVOSŤ (NEPREHLIADNUTEĽNÉ): Vychádzaj VÝLUČNE z obsahu tejto pikošky (názov, perex, obsah nižšie). NEVYMÝŠĽAJ a NEPRIDÁVAJ fakty, čísla, mená, dátumy, miesta ani detaily, ktoré v zdroji NIE SÚ. Ak niečo nie je v zdroji, nepíš to. Žiadne odhady, žiadne "pravdepodobne", žiadne prikrášľovanie. Každé tvrdenie musí byť podložené zdrojom. Hook smie byť pútavý, ale NESMIE klamať.\n' +
    '\n' +
    'Polia:\n' +
    '- hookFakt: 1 ÚDERNÁ úplná veta, VEĽMI KRÁTKA — ideálne 3-4 slová, max 5 (so slovesom). Musí sa zmestiť na JEDEN riadok. Odvážne, takmer neuveriteľné tvrdenie, ktoré ZAUJME, ale neprezradí pointu/twist. (napr. "Pyramídy stáli na pive.")\n' +
    '- hookSlucka: 1 úplná veta, MAXIMÁLNE 7 slov (so slovesom) — vyhrotí napätie a SĽÚBI prekvapivý zvrat, ale NIKDY ho neprezradí. (napr. "A jeden meškajúci sud spustil dejiny.")\n' +
    '  ⚠️ DĹŽKA HOOKU JE TVRDÉ PRAVIDLO: slide 1 má MÁLO MIESTA, font je veľký — hookFakt + hookSlucka SPOLU max ~11 slov / 3 riadky. Pridlhý hook = malé písmo alebo stena textu = ZLE. Drž ho čo NAJKRATŠÍ a najúdernejší.\n' +
    '  TVRDÉ PRAVIDLO: konkrétny twist/payoff z poľa "pointa" (napr. "prvý štrajk v dejinách") patrí VÝLUČNE na slide 4. NESMIE sa objaviť v hookFakt ani hookSlucka — tam naň iba napínaš. Ak by sa twist dostal do hooku, slide 4 stratí pointu.\n' +
    '- rok: VYPLŇ LEN ak je v pikoške uvedený KONKRÉTNY rok (napr. "1232"). Ak rok nie je jasne uvedený, daj prázdny reťazec "" — NEVYMÝŠĽAJ a NEODHADUJ (napr. starovek bez presného roku nech ostane prázdny). Štítok sa vtedy nezobrazí.\n' +
    '- pribeh: 1-2 vety — kto a čo urobil, začiatok príbehu (slide 2).\n' +
    '- eskalacia: 1-2 vety — čo sa stalo ďalej, kauzálna reťaz (slide 3). NEPREZRADIŤ twist.\n' +
    '- pointa: 1-2 vety — PAYOFF, ktorý ZODPOVIE/uzavrie napätie z hooku. Úderná, prekvapivá, zapamätateľná, s konkrétnym faktom alebo číslom. Toto je vyvrcholenie — musí "kliknúť". Žiadne opisné dokončenie, žiadne filozofické závery.\n' +
    '- otazkaKonca: 1 provokatívna otázka pre komentáre (len do popisu).\n' +
    '- klucoveSlova: pole 4-8 KRÁTKYCH úderných slov (1-2 slová) na zvýraznenie: mená, miesta, čísla, roky, prekvapivé slovesá, silné podstatné mená. PRESNE ako sú napísané v texte. NIE dlhé generické frázy (napr. NIE "vitamíny skupiny B", radšej "tekuté jedlo"). ROZLOŽ ich tak, aby v KAŽDEJ vete (hookFakt, hookSlucka, pribeh, eskalacia, pointa) bolo aspoň 1 zvýraznené slovo.\n' +
    'ČISTÝ TEXT: NEPOUŽÍVAJ markdown ani hviezdičky (** *), podčiarkovníky ani spätné apostrofy v ŽIADNOM textovom poli. Píš obyčajný čistý text. Zvýraznenie sa rieši VÝLUČNE cez pole klucoveSlova, NIE v texte.\n' +
    'PRAVIDLÁ: max 2 vety na slide, krátke a úderné, ALE VŽDY GRAMATICKY ÚPLNÉ A SPRÁVNE — každá veta má podmet a SLOVESO.\n' +
    'ŽIADNE telegrafické útržky bez slovesa (ZLE: "Každý deň 4-5 litrov piva." → DOBRE: "Každý deň dostali 4-5 litrov piva.").\n' +
    'ŽIADNE visiace prístavky (ZLE: "robotníci štrajkovali — prvý zaznamenaný štrajk." → DOBRE: "robotníci štrajkovali, išlo o prvý zaznamenaný štrajk v histórii.").\n' +
    'Limity dĺžky na slidoch 2-4 sú ORIENTAČNÉ (radšej úplná veta než useknutá). ALE limit HOOKU (slide 1) je TVRDÝ — drž ho krátky, max 3 riadky. Hook nesmie prezradiť pointu.\n' +
    `Pikoška: názov=${pik.nadpis}, perex=${pik.perex}, obsah=${obsah}. Odpovedz LEN JSON, nič iné.`;

  // Model občas vráti neúplný JSON alebo PRIDLHÝ hook. Skús až 4×; vezmi prvý,
  // ktorý má všetky polia A hook sa zmestí do 3 riadkov. Fallback = najkratší hook.
  let best: Copy | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const raw = await generateWithRetry(userPrompt);
    const jsonText = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText.slice(start, end + 1));
    } catch {
      continue; // pokazený JSON -> skús znova
    }
    // Vyčisti markdown – model občas obalí slová hviezdičkami (**slovo**), satori by ich vykreslil ako znaky.
    const clean = (s: any) => String(s || '').replace(/[*_`]+/g, '').replace(/\s+/g, ' ').trim();
    const copy: Copy = {
      hookFakt: clean(parsed.hookFakt),
      hookSlucka: clean(parsed.hookSlucka),
      rok: clean(parsed.rok),
      pribeh: clean(parsed.pribeh),
      eskalacia: clean(parsed.eskalacia),
      pointa: clean(parsed.pointa),
      otazkaKonca: clean(parsed.otazkaKonca),
      klucoveSlova: Array.isArray(parsed.klucoveSlova) ? parsed.klucoveSlova.map(clean).filter(Boolean) : [],
    };
    const full = copy.hookFakt && copy.hookSlucka && copy.pribeh && copy.eskalacia && copy.pointa;
    if (!full) continue;
    // Fallback = úplná verzia s najkratším hookom.
    const hookLen = (c: Copy) => (c.hookFakt + ' ' + c.hookSlucka).length;
    if (!best || hookLen(copy) < hookLen(best)) best = copy;
    // Ideál: hook sa zmestí do 3 riadkov pri čitateľnom fonte.
    if (hookFitsThreeLines(copy.hookFakt, copy.hookSlucka)) return copy;
  }
  if (best) return best; // žiadny ideálny hook za 4 pokusy → vezmi najkratší (auto-fit ho ešte zmenší)
  throw new Error('Model nevrátil kompletný obsah ani po 4 pokusoch.');
}

// ---------------------------------------------------------------------------
// Vercel Blob – Buffer GraphQL neberie base64, obrázok musí byť verejná URL.
// ---------------------------------------------------------------------------
async function uploadToBlob(buf: Buffer, filename: string): Promise<string> {
  const { url } = await put(filename, buf, {
    access: 'public',
    contentType: 'image/png',
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return url;
}

// ---------------------------------------------------------------------------
// Buffer naplánovanie
// ---------------------------------------------------------------------------
function scheduledAt(datum: string | undefined, hh: number, mm: number): string {
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
  // UTC instant pre dané lokálne hh:mm (Bratislava) na konkrétny deň.
  const instantFor = (dateStr: string) => {
    const [y, m, day] = dateStr.split('-').map(Number);
    let off = offsetMinutes(Date.UTC(y, m - 1, day, hh, mm, 0));
    off = offsetMinutes(Date.UTC(y, m - 1, day, hh, mm, 0) - off * 60000);
    return Date.UTC(y, m - 1, day, hh, mm, 0) - off * 60000;
  };

  let dateStr = (datum || new Date().toISOString()).slice(0, 10);
  let instant = instantFor(dateStr);
  // Ak je termín v minulosti (alebo do 5 min od teraz), posuň na ďalší deň.
  const minFuture = Date.now() + 5 * 60000;
  let guard = 0;
  while (instant < minFuture && guard < 400) {
    const next = new Date(dateStr + 'T00:00:00Z');
    next.setUTCDate(next.getUTCDate() + 1);
    dateStr = next.toISOString().slice(0, 10);
    instant = instantFor(dateStr);
    guard++;
  }
  return new Date(instant).toISOString();
}

// DRAFT režim: kým testujeme, posielame do Buffera ako DRAFT (saveToDraft: true).
// Post sa NEzverejní sám – Katarína si ho v Bufferi pozrie a publikuje ručne.
// Na ostrý auto-publish (naplánovaný na dueAt) prepni na false.
// Zdroj: https://developers.buffer.com/examples/create-draft-post.html
const BUFFER_SAVE_AS_DRAFT = true;

// Buffer GraphQL API (nový). Obrázky musia byť verejné URL (z Vercel Blobu).
// CAROUSEL: posielame celé pole obrázkov cez `assets: [{ image: { url } }]`.
// Pri MutationError alebo HTTP chybe throwne.
async function postToBuffer(params: {
  channelId: string;
  text: string;
  imageUrls: string[];
  dueAt: string;
  platform: 'instagram' | 'tiktok';
}): Promise<any> {
  // assets je zoznam – každý slide ako { image: { url: "..." } } = carousel.
  const assetsGql = params.imageUrls
    .map((u) => `{ image: { url: ${JSON.stringify(u)} } }`)
    .join(', ');

  // Instagram vyžaduje metadata.instagram.type (POVINNÉ) + shouldShareToFeed (POVINNÉ).
  // type: post = klasický feed post (zvládne viac obrázkov = carousel).
  // TikTok žiadne povinné metadata nemá, preto ho vynechávame.
  const metadataGql =
    params.platform === 'instagram'
      ? `metadata: { instagram: { type: post, shouldShareToFeed: true } },`
      : '';

  // TikTok = remind (notifikácia, Katarína publikuje ručne s hudbou).
  // IG = draft (saveToDraft: true, Katarína schvaľuje a publikuje).
  // OSTRÝ režim (BUFFER_SAVE_AS_DRAFT=false): customScheduled + dueAt.
  const schedulingGql = BUFFER_SAVE_AS_DRAFT
    ? params.platform === 'tiktok'
      ? `schedulingType: notification, mode: customScheduled, dueAt: ${JSON.stringify(params.dueAt)},`
      : 'schedulingType: automatic, mode: addToQueue, saveToDraft: true,'
    : `schedulingType: automatic, mode: customScheduled, dueAt: ${JSON.stringify(params.dueAt)},`;

  // text aj ostatné hodnoty bezpečne vložené ako GraphQL string literály.
  const query = `mutation {
    createPost(input: {
      text: ${JSON.stringify(params.text)},
      channelId: ${JSON.stringify(params.channelId)},
      ${schedulingGql}
      ${metadataGql}
      assets: [${assetsGql}]
    }) {
      __typename
      ... on PostActionSuccess { post { id dueAt assets { id } } }
      ... on MutationError { message }
    }
  }`;

  const res = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.BUFFER_API_KEY || ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Buffer HTTP ${res.status}: ${JSON.stringify(json)}`);
  if (json?.errors) throw new Error(`Buffer GraphQL errors: ${JSON.stringify(json.errors)}`);

  const result = json?.data?.createPost;
  if (!result) throw new Error(`Buffer: neočakávaná odpoveď: ${JSON.stringify(json)}`);
  if (result.__typename === 'MutationError' || (result.message && !result.post)) {
    throw new Error(`Buffer MutationError: ${result.message || 'neznáma chyba'}`);
  }

  const accepted = Array.isArray(result.post?.assets) ? result.post.assets.length : 0;
  console.log(
    `Buffer post OK (kanál ${params.channelId}): poslaných ${params.imageUrls.length} slidov, Buffer prijal ${accepted} obrázok/ov.`
  );

  return {
    postId: result.post?.id ?? null,
    dueAt: result.post?.dueAt ?? params.dueAt,
    sentSlides: params.imageUrls.length,
    bufferAccepted: accepted,
  };
}

// ---------------------------------------------------------------------------
// Sanity označenie publikované
// ---------------------------------------------------------------------------
async function markPublished(id: string, ttUrls?: string[], caption?: string): Promise<void> {
  const set: any = { publikovaneSocial: true };
  if (ttUrls?.length) set.tiktokSlides = ttUrls;
  if (caption) set.socialCaption = caption;
  const res = await fetch(
    `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SANITY_WRITE_TOKEN || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mutations: [{ patch: { id, set } }] }),
    }
  );
  if (!res.ok) throw new Error(`Sanity mutate ${res.status}: ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
async function run(targetSlug?: string, preview?: boolean, igTime?: string, force?: boolean, dest?: string) {
  // Hobby plán má limit 60 s na funkciu – spracujeme 1 pikošku na beh.
  // Cron beží denne, takže fronta sa postupne vyprázdni.
  // Ak je zadaný ?slug=..., zacieli sa KONKRÉTNA pikoška (aj keď je už označená)
  //   – na ručné / kontrolované behy (napr. prvý draft). Bez slug = najstaršia v rade.
  const pikosky: Pikoska[] = targetSlug
    ? await sanity.fetch(
        force
          ? `*[_type == "pikoska" && slug.current == $slug][0...1]{_id, nadpis, slug, kategoria, perex, obsah, obrazok, datumPublikacie}`
          : `*[_type == "pikoska" && slug.current == $slug && publikovaneSocial != true][0...1]{_id, nadpis, slug, kategoria, perex, obsah, obrazok, datumPublikacie}`,
        { slug: targetSlug }
      )
    : await sanity.fetch(
        `*[_type == "pikoska" && datumPublikacie >= now() - 60*60*24 && datumPublikacie <= now() + 60*60*24 && publikovaneSocial != true]
          | order(datumPublikacie asc)[0...1]{
            _id, nadpis, slug, kategoria, perex, obsah, obrazok, datumPublikacie
          }`
      );

  if (!pikosky.length) {
    return { ok: true, processed: 0, message: 'Žiadne pikošky na publikovanie.' };
  }

  // PREVIEW: len vygeneruj text (Copy) a vráť ho – nič sa nevykresľuje ani neposiela.
  // Na rýchlu kontrolu obsahu (hook, pointa...) bez spamovania Buffera.
  if (preview) {
    const out: any[] = [];
    for (const pik of pikosky) {
      const copy = await generateCopy(pik);
      out.push({ nadpis: pik.nadpis, slug: pik.slug?.current, copy });
    }
    return { ok: true, preview: true, items: out };
  }

  // DEST=urls: vygeneruj TikTok karusel, nahraj na Vercel Blob a VRÁŤ verejné URL.
  // Neposiela do Buffera ani neoznačuje publikované – slúži na naplánovanie cez OneUp (MCP).
  // Označenie publikované rieši volajúci (Claude) až po úspešnom naplánovaní v OneUp.
  if (dest === 'urls') {
    const fontsU = await loadFonts();
    const out: any[] = [];
    for (const pik of pikosky) {
      try {
        const copy = await generateCopy(pik);
        const ttSlides = await buildCarousel(pik, copy, fontsU, { w: 1080, h: 1920 });
        const caption = buildCaption(copy, pik);
        const ttUrls = await Promise.all(
          ttSlides.map((b, i) => uploadToBlob(b, `tt-${pik._id}-${i}.png`))
        );
        out.push({ id: pik._id, nadpis: pik.nadpis, slug: pik.slug?.current, caption, ttUrls, ok: true });
      } catch (err: any) {
        out.push({ id: pik._id, nadpis: pik.nadpis, slug: pik.slug?.current, ok: false, error: err?.message || String(err) });
      }
    }
    return { ok: true, dest: 'urls', items: out };
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
      let ttUrls: string[] = [];
      if (igChannel) {
        const igUrls = await Promise.all(
          igSlides.map((b, i) => uploadToBlob(b, `ig-${pik._id}-${i}.png`))
        );
        buffer.ig = await postToBuffer({
          channelId: igChannel,
          text: caption,
          imageUrls: igUrls,
          dueAt: igTime ? scheduledAt(pik.datumPublikacie, parseInt(igTime.split(':')[0]), parseInt(igTime.split(':')[1])) : scheduledAt(pik.datumPublikacie, 19, 7),
          platform: 'instagram',
        });
      }
      if (ttChannel) {
        ttUrls = await Promise.all(
          ttSlides.map((b, i) => uploadToBlob(b, `tt-${pik._id}-${i}.png`))
        );
        buffer.tiktok = await postToBuffer({
          channelId: ttChannel,
          text: caption,
          imageUrls: ttUrls,
          dueAt: scheduledAt(pik.datumPublikacie, 18, 33),
          platform: 'tiktok',
        });
      }

      await markPublished(pik._id, ttUrls, caption);

      results.push({ id: pik._id, nadpis: pik.nadpis, ok: true, buffer, tiktokSlides: ttUrls });
    } catch (err: any) {
      results.push({ id: pik._id, nadpis: pik.nadpis, ok: false, error: err?.message || String(err) });
    }
  }

  return { ok: true, processed: results.length, results };
}

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const slug = params.get('slug') || undefined;
    const preview = params.get('preview') === '1';
    const igTime = params.get('igTime') || undefined;
    const force = params.get('force') === '1';
    const dest = params.get('dest') || undefined;
    const out = await run(slug, preview, igTime, force, dest);
    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}

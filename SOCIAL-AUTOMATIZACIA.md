# SOCIAL AUTOMATIZÁCIA — funkčný vzor (motor)

> Toto je hotový recept. Pri novom social projekte (napr. Háčik) sa NEzačína od nuly —
> skopíruje sa toto riešenie a menia sa len projektovo-špecifické veci (dole).
> Tok (AKTUÁLNY): **Sanity → Claude Opus → satori carousel → Vercel Blob → OneUp (TikTok, s hudbou)**
> Tok (STARÝ, nahradený): ~~… → Buffer (IG + TikTok)~~ — Buffer mal limit 10/kanál, nahradený OneUpom.

---

## 🟢 POSTING CEZ ONEUP (AKTUÁLNY MODEL, od 1.7.2026)

Buffer (limit 10/kanál) nahradený **OneUp** — bez limitu, s TikTok hudbou pri karuseloch, riadené cez **OneUp MCP** priamo z Claude Code.

**Dva nové režimy v `route.ts` (motor ostáva, len sa odklonil od Buffera):**
- **`?slug=X&dest=urls`** → vygeneruje TikTok karusel (1080×1920), nahrá na Vercel Blob, **VRÁTI verejné URL + caption**. Neposiela nikam, neoznačuje. (60 s Vercel limit = 1 pikoška/volanie → volaj po slug.)
- **`?slug=X&dest=mark`** → LEN označí pikošku `publikovaneSocial=true` v Sanity (write token žije vo Verceli). Volá sa AŽ po úspešnom naplánovaní v OneUp.

**Mesačný dávkový workflow (overený, spoľahlivý):**
1. Zisti nepublikované: `count(*[_type=="pikoska" && publikovaneSocial != true])`
2. Pre každý slug zavolaj `?slug=X&dest=urls` → zbierka URL + caption (dá sa dávkovo cez bash slučku).
3. Cez **OneUp MCP `schedule-image-post-tool`** naplánuj každý post: `category_id`, `social_network_id` (TikTok účet), `scheduled_date_time` (1/deň o 18:33), `content` (caption), `image_url` (5 URL spojených cez `~~`), `tiktok` (hudba).
4. Po úspechu označ všetky cez `?slug=X&dest=mark`.

**Hudba (len pri OBRÁZKOVÝCH karuseloch — TikTok pri videách API hudbu NEpovolí):**
- `get-tiktok-trending-sound-tool` (country_code, date_range=30DAY, genre napr. CLASSICAL, social_account_id) → vráti ~100 zvukov.
- Výsledok je OBROVSKÝ (200k+ znakov) → uloží sa do súboru, čítaj cez `jq`. Vytiahni `trending_song_clip.song_clip_id`, `preview_url`, `thumbnail_url`, `commercial_music_name`, `artist`.
- POZOR: `music_sound_id` MUSÍ byť REÁLNE `song_clip_id` (nie placeholder ako "1" — inak sa post potichu nepridá / nezobrazí).
- Vybrať 3–10 zvukov a **rotovať** ich dokola cez posty (index `i % pocet`).
- Niektoré zvuky nemajú `song_clip_id` (null) → preskočiť.

**OneUp MCP prepojenie:**
- Plán **Basic $15/mes** stačí — API & MCP access je v KAŽDOM pláne. 5 social účtov, 300 scheduled/mes.
- API kľúč z **oneupapp.io/api-access**. MCP URL: `https://feed.oneupapp.io/mcp/oneup?apiKey=KLUC` v `.mcp.json`.
- V `.claude/settings.local.json`: `"enableAllProjectMcpServers": true`, `"enabledMcpjsonServers": ["oneup"]` + `"defaultMode": "bypassPermissions"` (nech sa nepýta na allow).
- Kľúč NIKDY do chatu (ani screenshot — číta sa vizuálne!). Ulož do `.txt`, načítaj cez bash bez vypísania, súbor zmaž.
- `list-categories-tool` → category_id. `list-social-accounts-tool` → social_account_id (TikTok).

**Denný Buffer cron VYPNUTÝ** — posting je teraz mesačná dávka cez OneUp. Rýchlosť webu NErieši cron, ale ISR `export const revalidate = 300` v `app/page.tsx` (nezávislé od social).

**AI-generated label:** `schedule-image-post-tool` nemá API parameter na tento label → zapnúť raz v OneUp appke/nastaveniach účtu, nie per post.

**Dizajn opravy (nasadené 1.7.2026, platia pre TikTok 1080×1920):**
- Slide 1: logo `logoTop = 42%` (bolo 50%), `gradStop = 60%` — logo hore, neprekrýva hook.
- Slidy 2–4: text blok `top: 24%` (bolo 18%) — jemne nižšie, mimo horného UI TikToku.
- Rímska číslica za menom (napr. „Viliam I.") sa NEzalomí na nový riadok — zlepí sa s predchádzajúcim slovom (`isRomanNumeral` v `wrappedWords`).

---

## 🚨 ZLATÉ PRAVIDLO — CAROUSEL NÁHĽAD (PORUŠENIE = ZAKÁZANÉ)

> **`node preview-all.mjs` — VŽDY lokálne. NIKDY endpoint, NIKDY Vercel kvôli dizajnu.**

Každá vizuálna zmena carouselu sa overuje VÝLUČNE takto:
```bash
cd /Users/katarinasiskova/Desktop/CuriosityLab/clab && node preview-all.mjs
```
→ 5 PNG za ~5 sekúnd. Claude ich zobrazí v chate. Katarína schváli. Až potom push.

**Endpoint (`/api/social-refill`) sa NEVOLÁ na overenie dizajnu.** Slúži LEN na produkčné posielanie do Buffera.

Toto pravidlo sa porusilo — preto je tu. Nebude sa opakovať.

---

---

## SPRÁVANIE PRI NOVOM SOCIAL PROJEKTE

Claude Code sa na začiatku spýta: **„Robíme carousel?"**
Ak áno → **rovno nasadí nižšie schválený dizajn** (5 slidov, IG + TikTok) a len ho
preklopí do **farieb, fontov a loga daného brandu**. Dizajn neobjavovať znova.

---

## ✅ SCHVÁLENÝ DIZAJN CAROUSELU (Curiosity Lab, 20.6.2026)

**Formáty (defaultne oba naraz):**
- Instagram: **1080 × 1350** (4:5)
- TikTok: **1080 × 1920** (9:16)

**Farby:**
- Pozadie: `#0a0a0a`
- Zvýraznenie (zelená): `#c8f135`
- Text biely `#ffffff`, telo slidov 2–4: `#eeeeee`

**Fonty — TYP SA NEMENÍ, len veľkosť:**
- `Barlow ExtraBold 800` — hook (slide 1), zelené kľúčové slová
- `Barlow Bold 700` — telo (slidy 2–4)
- `Barlow Condensed Bold 700` — logo (CURIOSITY / LAB), ROK štítok, pill, „link v bio"
- Zdroj: `cdn.jsdelivr.net/gh/google/fonts@main/ofl/barlow` + `.../barlowcondensed`
- ⚠️ TTF (nie woff!), musí mať latin-ext (á č ď ž ľ…)

**Logo — `LOGO_SCALE = 0.72` (nemeniť):**
- `logoMark()` = kosoštvorec (border zelený, rotácia 45°, glow) + malý kosoštvorec + CURIOSITY / LAB
- `emblemLabeled()` = logoMark + full-width gradientové čiary po stranách — **len slide 1**
- Slidy 2–5: `logoMark()` bez čiar, vycentrovaný nad textom, `marginBottom: 4px`

**Predložky a spojky (lepenie):**
PREP množina: `a, aj, i, k, o, s, u, v, z, do, na, za, zo, so, vo, ku, po, od, pri, pre, nad, pod, bez`
→ nesmú ostať samé na konci riadka, zlepia sa s nasledujúcim slovom do nezalomiteľnej skupiny.

---

**SLIDE 1 — HOOK:**
- Fotka pikošky na pozadí + gradient:
  `linear-gradient(180deg, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.0) 15%, rgba(10,10,10,0.5) 36%, rgba(10,10,10,0.95) **46%[IG] / 68%[TT]**, rgba(10,10,10,1.0) 70%)`
- `emblemLabeled()` pozícia: IG `top: 49%`, TikTok `top: 50%` — ľavý/pravý okraj `130px` (oba formáty)
- Font: auto-fit štartuje na **96px**, kroky `[96, 88, 80, 72]`, kým `hookFakt + hookSlucka ≤ 3 riadky celkovo`; lineHeight `1.25`
- Text pozícia: IG `bottom: 14%`, TikTok `bottom: 26%` — ľavý/pravý okraj `130px` (oba formáty)
- Zarovnanie: **stred** (`center`) — IG aj TikTok
- Medzera medzi vetami: `marginBottom: 20px`

**SLIDY 2–4 — PRÍBEH / ESKALÁCIA / POINTA:**
- Fotka na pozadí, prekryv: `linear-gradient(rgba(10,10,10,0.78) 0%, rgba(10,10,10,0.88) 100%)`
- `logoMark()` vycentrovaný nad textom, `marginBottom: 4px`
- Obsah v stĺpci: `top: 18%`, `height: 58%`, `gap: 44px` medzi vetami
- Ľavý/pravý okraj: **86px** (IG aj TikTok)
- Font tela: **64px** (56px ak text > 230 znakov), weight `700`, lineHeight `1.55`
- Zarovnanie: **stred** (`center`) — IG aj TikTok
- Slide 2: zelený štítok `ROK XXXX` **LEN ak je v pikoške konkrétny rok** — nikdy nenútiť

**SLIDE 5 — OUTRO:**
- Čierne pozadie (bez fotky), ľavý/pravý okraj `86px`
- Layout: stĺpec, všetko vycentrované, `gap: 54px`, `height: 100%`
- Poradie zhora: `logoMark()` → „Chceš viac **zabudnutých** faktov?" (font 78px, weight 800) → zelená šípka SVG (84×96px) → zelený pill `www.curiositylab.sk` (font 54px, padding `32px 86px`, borderRadius 50) → biele „link v bio" (font 54px)

**Zvýrazňovanie:**
- Claude Opus vracia `klucoveSlova` (4–8 fráz) → zelené + weight 800
- `ensureGreen` = záruka aspoň 1 zeleného slova na každú vetu

---

## ✅ OBSAHOVÁ ŠTRUKTÚRA (schválená — Gemini píše PRIAMO na 5 slidov)

Gemini negeneruje jeden blok textu, ale **pole na slide** (inak sa text seká nerovnomerne
a slide 1 sa celý zazelení). Polia: `hookFakt, hookSlucka, rok, pribeh, eskalacia, pointa,
otazkaKonca, klucoveSlova`.

- **Slide 1 — HOOK:** `hookFakt` (1 veta) = šokujúci fakt/paradox. `hookSlucka` (1 veta) =
  otvorená slučka, núti swipnúť. Obe vety biele, **zelené sú LEN kľúčové slová** (nie celá veta).
  Hook NESMIE prezradiť pointu. Žiadny rok.
- **Slide 2 — PRÍBEH:** `pribeh` (kto/čo, 1-2 vety) + štítok `ROK …` (zelený) **LEN ak je v pikoške
  konkrétny rok**. Ak rok nie je, NEDÁVAŤ ho nasilu (napr. pyramídy) — štítok sa vynechá. Konkrétne mená/miesta.
- **Slide 3 — ESKALÁCIA:** `eskalacia` (čo ďalej, kauzálna reťaz, 1-2 vety). Neprezradiť twist.
- **Slide 4 — POINTA/TWIST:** `pointa` (otočenie + zapamätateľná bodka s konkrétnym faktom).
  Žiadne filozofické závery.
- **Slide 5 — PROMO:** vždy identický (logo, „Každý deň jeden zabudnutý fakt z histórie.", šípka, pill).

Pravidlá: max 2 vety/slide, čitateľné za 2-3 s, 1-4 zelené slová/slide. Veľkosť písma na 2-4 sa
prispôsobuje dĺžke textu (dlhšie = menšie, aby malo vzduch). Plná predloha: `podklady/dizajn/Karousel/curiositylab-carousel-struktura.md`.

**Workflow:** keď Katarína odsúhlasí carousel, tento dizajn + štruktúra sú štandard a aplikujú sa
automaticky na každú pikošku (cez `?slug=` cielene, alebo cron na najstaršiu v rade).

---

## ✍️ COPYWRITING — PRAVIDLÁ OBSAHU (sú v Claude prompte, route.ts)

- **HOOK = priorita č. 1.** Rozhoduje, či to vôbec niekto pozrie. Curiosity gap:
  zaujať a ZATAJIŤ to hlavné. Techniky: paradox, zakázané/tajné, šokujúce číslo, nečakaná príčina-následok.
  - Hook NESMIE: prezradiť pointu/twist, byť plochá otázka („Prečo…?"), nudný opis.
  - **Twist/payoff patrí VÝLUČNE na slide 4** — nikdy nie v hooku.
  - **DĹŽKA HOOKU = TVRDÉ PRAVIDLO:** hookFakt ≤5 slov (1 riadok), hookSlucka ≤7 slov, SPOLU max 3 riadky.
    Kód to vynucuje (validácia odmietne dlhý hook a regeneruje). Príklad: „Pyramídy stáli na pive." + „A jeden meškajúci sud spustil dejiny."
- **GRAMATIKA:** vždy úplné vety so slovesom. Žiadne telegrafické útržky ani visiace prístavky.
  Slovenská interpunkcia (napr. pred „alebo" pri rovnocenných možnostiach sa čiarka NEPÍŠE).
- **PRAVDIVOSŤ:** čerpať VÝLUČNE zo zdroja (pikoška). NEVYMÝŠĽAŤ fakty, čísla, mená, dátumy. Hook smie zaujať, ale NESMIE klamať.
- **DĹŽKA tela (slidy 2-4):** orientačná, radšej úplná veta. ALE hook je TVRDÝ (krátky).
- **KĽÚČOVÉ SLOVÁ:** krátke úderné (1-2 slová) — mená, miesta, čísla, silné slovesá. NIE dlhé generické frázy.
- **HLAS:** ľudský, žiadne AI klišé, žiadne pomlčky, krátke úderné vety (soul.md z kurzu).
- **CAPTION = krátky:** príbeh je v slidoch, popis ho NEduplikuje. Štruktúra: hook 🔥 + otázka 👇 +
  „📖 Celú pikošku si prečítaš na curiositylab.sk — link v bio" + hashtagy. Cieľ = traffic na web.

## 🖼️ LOKÁLNY NÁHĽAD (PNG bez deployu) — POVINNÝ KROK PRED PUSHOM

Pri každej vizuálnej zmene carouselu sa NEPUSHUJE naslepo. Najprv sa **všetky slidy**
vyrenderujú **lokálne do PNG** a ukážu Kataríne **priamo v chate** (nie na Desktope!).
Až po jej OK ide push. Katarína nemá čakať na deploy kvôli tomu, ako niečo vyzerá.

**Postup náhľadu:**
1. `cd clab && node preview-all.mjs` → 5× IG PNG do `.preview-*.png`
2. Pre TikTok: inline node script (1080×1920) → `.preview-tt-*.png`
3. Claude číta PNG cez `Read` tool a zobrazí ich v chate — **HNEĎ**, bez čakania
4. Katarína schváli → push → deploy

**PRAVIDLÁ náhľadu (záväzné):**
- Obrazky sa zobrazujú VŽDY V CHATE, nikdy nie „pozri na Desktope"
- Najprv ukázať slide ktorý sa menil, až potom (ak OK) všetkých 5
- **REÁLNA fotka + REÁLNY schválený text — POVINNÉ.** Nikdy placeholder!
  - Fotka: zo Sanity (`cdn.sanity.io/images/74b6xpqc/...`), sharp cover 1080×výška
  - Text: hardcoded z posledného schváleného copy (hookFakt, hookSlucka, pribeh, eskalacia, pointa, klucoveSlova)
- **CACHE = SAMOZREJMOSŤ.** Fonty (3× Barlow TTF) + fotka sa stiahnu RAZ do `clab/.cache/`.
  Re-render ~3 s, načítanie z cache ~2 ms. Nikdy nesťahovať znova.
- Logika preview MUSÍ zrkadliť `route.ts` 1:1 (logo, fonty, paddingy, predložky).
- `clab/.cache/`, `clab/.preview-*.png`, `preview-*.mjs` → `.gitignore` (nie do commitu)
- ⚠️ satori NEpodporuje `transform: translateY(%)`. Pozície = px alebo `top/bottom %` na absolútnom prvku.

## 🛠️ TECHNICKÉ FUNKCIE (route.ts)

- **Copy model:** Claude Opus 4.8 (`claude-opus-4-8`), `ANTHROPIC_API_KEY` vo Verceli. ~2 centy/post.
- **DRAFT flag** `BUFFER_SAVE_AS_DRAFT` — **TERAZ `true` = DRAFT** (Katarína schvaľuje a publikuje ručne). Prepnúť na `false` až keď bude spokojná a chce auto-publish.
- **Cielenie pikošky:** `?slug=...` (konkrétna, aj keď je už označená). Bez slug = najstaršia v rade (cron).
- **PREVIEW:** `?preview=1` — vráti LEN text (Copy) bez kreslenia a bez Buffera. Hlavný iteračný nástroj.
- **RETRY + validácia:** SDK opakuje pri 429/529/5xx; navyše cyklus až 4× kým nie sú všetky polia A hook ≤3 riadky.
- **Slide 1:** zelené len kľúčové slová + ensureGreen (záruka 1 zeleného slova/veta) + auto-fit fontu (96→88→80→72, kým ≤3 riadky celkovo).
- **Slidy 2-4:** ensureGreen aj tu, jednotný font, jemná fotka v pozadí (prekryv 0.78–0.88).
- **Rok:** len ak je v pikoške konkrétny (nenútiť).
- **Časy (nepárne, mimo okrúhleho náporu):** TikTok 18:33 (IG 19:07 — už neriešime, len TikTok).
- **Cron:** ⚠️ ZASTARANÉ — denný Buffer cron VYPNUTÝ. Posting je teraz mesačná dávka cez OneUp MCP
  (viď sekcia „POSTING CEZ ONEUP" hore). Rýchlosť webu drží ISR `revalidate=300` v `page.tsx`, nie cron.

## ČO JE UŽ VYRIEŠENÉ (kopíruj, neobjavuj znova)

- **Buffer GraphQL API:** endpoint `https://api.buffer.com`, Bearer token, mutation `createPost`
- Carousel = pole `assets: [{ image: { url } }, ...]` (NIE imageUrl, NIE base64)
- Buffer Instagram POVINNÉ: `metadata: { instagram: { type: post, shouldShareToFeed: true } }`
- Buffer TikTok: žiadne povinné metadata
- Buffer mode: `customScheduled`, `schedulingType: automatic`, `dueAt` ISO 8601
- Obrázky musia byť na verejnej URL → **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`,
  pri Connect to Project ZAŠKRTNÚŤ „Add read-write token env var")
- Idempotencia: GROQ filter `publikovaneSocial != true`, spracovanie 1 položky/beh
- Copy model: **Claude Opus 4.8** (`@anthropic-ai/sdk`, `claude-opus-4-8`) — prepnuté z Gemini 19.6.2026
  kvôli konzistentnejšej kvalite (hooky, slovenčina, dodržiavanie pravidiel, žiadny markdown/prázdne).
  Kľúč `ANTHROPIC_API_KEY` vo Verceli. SDK sám opakuje pri 429/529/5xx (`maxRetries`). Náklad ~2 centy/post.
- **Hlas značky (soul rules) v `SYSTEM_PROMPT`** — aby texty nezneli ako AI:
  žiadne pomlčky, žiadne vatové frázy, žiadne generické AI vzory; krátke úderné vety,
  konkrétne detaily (mená/čísla/roky), osobnosť rozprávača. (Inšpirované „soul.md" z kurzu.)
- Draft vs ostrý: riadi flag `BUFFER_SAVE_AS_DRAFT` v route.ts. **TERAZ je `true` = DRAFT** (Katarína schvaľuje a publikuje ručne v Bufferi).
  - `true` = DRAFT → posty prídu do Buffer fronty ako drafty, Katarína ich skontroluje a ručne zverejní.
  - `false` = OSTRÝ (`mode: customScheduled, dueAt`) → naplánuje a Buffer sám zverejní (TikTok 18:33, IG 19:07).
  - Prepnúť na `false` až keď bude Katarína spokojná a chce plný auto-pilot.

---

## ČO MENIŤ PRI NOVOM PROJEKTE (per-projekt)

1. Sanity project ID + dataset + write token
2. **OneUp:** pripoj nový TikTok účet v OneUp → cez MCP zisti `social_account_id` + `category_id`.
   (API kľúč OneUp je per-účet Katky, MCP prepojenie stačí spraviť raz.)
3. Vercel env premenné + nový Blob store (`BLOB_READ_WRITE_TOKEN`)
4. Claude Opus systémový prompt (iný tón/obsah pre daný brand) — `SYSTEM_PROMPT` v route.ts
5. **Carousel dizajn v satori** (farby, font, logo, layout) — zaberie najviac času
6. Hashtag systém z poľa `kategoria` + filter citlivých slov
7. Trending hudby: vybrať 3–10 zvukov pre daný brand (vibe) cez `get-tiktok-trending-sound`

---

## POSTUP REPLIKÁCIE (poradie)

1. Skopíruj `route.ts` z funkčného projektu
2. Vymeň projektovo-špecifické konštanty (1–4 vyššie)
3. Prispôsob satori dizajn (5)
4. `nvm use 20` → build → push → počkať Vercel Ready → curl test
5. Skontroluj obrázky v Bufferi (diakritika, layout, rozmery) PRED publikovaním
6. Zmaž testovacie drafty, nasaď cron

---

## VYLEPŠENIA NA NESKÔR

- **Retry logika:** Gemini občas hodí 503 → cron o 7:00 by spadol. Skús 2–3× s pauzou.
- Pred replikáciou si vyžiadať od Claude „checklist na mieru" pre daný projekt.
- Lokálny náhľad carouselu (PNG za pár sekúnd) namiesto deployu kvôli testu.

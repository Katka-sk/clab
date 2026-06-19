# SOCIAL AUTOMATIZÁCIA — funkčný vzor (motor)

> Toto je hotový recept. Pri novom social projekte (napr. Háčik) sa NEzačína od nuly —
> skopíruje sa toto riešenie a menia sa len projektovo-špecifické veci (dole).
> Tok: **Sanity → Gemini → satori carousel → Vercel Blob → Buffer (IG + TikTok)**

---

## SPRÁVANIE PRI NOVOM SOCIAL PROJEKTE

Claude Code sa na začiatku spýta: **„Robíme carousel?"**
Ak áno → **rovno nasadí nižšie schválený dizajn** (5 slidov, IG + TikTok) a len ho
preklopí do **farieb, fontov a loga daného brandu**. Dizajn neobjavovať znova.

---

## ✅ SCHVÁLENÝ DIZAJN CAROUSELU (Curiosity Lab, 19.6.2026)

**Formáty (defaultne oba naraz):**
- Instagram: **1080 × 1350** (4:5)
- TikTok: **1080 × 1920** (9:16)
- Dizajn sa líši pozíciami a zarovnaním podľa formátu (viď nižšie).

**Farby:**
- Pozadie: `#0a0a0a` (čierna)
- Zvýraznenie (zelená): `#c8f135`
- Text biely `#ffffff`, jemne tlmený `#eeeeee`

**Fonty (satori potrebuje TTF, nie woff!) — TYP SA NEMENÍ, len veľkosť a padding:**
- `Barlow ExtraBold 800` — hook (slide 1), zelené kľúčové slová (weight 800)
- `Barlow Bold 700` — telo (slidy 2–4)
- `Barlow Condensed Bold 700` — logo (CURIOSITY LAB), „ROK", pill, „link v bio"
- Zdroj: `cdn.jsdelivr.net/gh/google/fonts@main/ofl/barlow` a `.../barlowcondensed`
- ⚠️ Font MUSÍ mať latin-ext pokrytie (á č ď ž ľ…) inak diakritika = ???

**Logo — `logoMark()` (kosoštvorec):**
- Veľký kosoštvorec (border zelený, rotácia 45°, glow) + malý kosoštvorec vnútri + CURIOSITY / LAB
- `LOGO_SCALE = 0.72` — globálna škála, nemeniť
- Slide 1: `emblemLabeled()` = logoMark + full-width gradientové čiary po stranách (Pruský štýl)
- Slidy 2–5: `logoMark()` bez čiar, vycentrovaný nad textom

**SLIDE 1 — HOOK (schválený 19.6.2026):**
- Fotka pikošky na pozadí, tmavý gradient: `linear-gradient(180deg, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.0) 15%, rgba(10,10,10,0.5) 36%, rgba(10,10,10,0.95) 46%[IG]/68%[TT], rgba(10,10,10,1.0) 70%)`
- `emblemLabeled()` pozícia: IG `top: 49%`, TikTok `top: 50%`
- Ľavý/pravý okraj: IG `86px`, TikTok `130px`
- Font: auto-fit štartuje na **96**, kroky [96, 88, 80, 72], kým `hookFakt + hookSlucka ≤ 3 riadky`
- Obe vety rovnaký font (nie väčší + menší)
- Text pozícia: IG `bottom: 14%`, TikTok `bottom: 26%`
- Zarovnanie: IG **ľavo** (`flex-start`), TikTok **stred** (`center`)
- Medzera medzi vetami: `marginBottom: 20px`
- Slovenské predložky (na, za, v, do…) sa lepia k ďalšiemu slovu — nesmú ostať samé na konci riadka

**SLIDY 2–4 — PRÍBEH/ESKALÁCIA/POINTA:**
- Jemná fotka na pozadí, prekryv: `linear-gradient(rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.9) 100%)`
- `logoMark()` vycentrovaný nad textom, `marginBottom: 4px`
- Font tela: **64px** (56px ak text > 230 znakov), weight 700, lineHeight 1.55
- Obsah v stĺpci: `top: 18%, height: 58%`, `gap: 44px` medzi vetami
- Zarovnanie textu: **ľavo** (IG aj TikTok)
- Ľavý/pravý okraj: IG `86px`, TikTok `130px`
- Slide 2: zelený štítok `ROK XXXX` LEN ak je konkrétny rok (nenútiť)

**SLIDE 5 — OUTRO:**
- Čierne pozadie (bez fotky)
- `logoMark()` nad textom (v stĺpci, nie fixovaný hore/dole)
- Text: „Chceš viac **zabudnutých** faktov?" (zabudnutých = zelené)
- Zelená šípka dole (SVG), zelená pill `www.curiositylab.sk`, biele „link v bio"
- Všetko vycentrované, `gap: 54px`

**Zvýrazňovanie:** Claude Opus vracia pole `klucoveSlova` (4–8 fráz) → zelené + weight 800.
`ensureGreen` = záruka aspoň 1 zeleného slova na každú vetu (aj keď žiadne kľúčové slovo nesedí).

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
- **DRAFT flag** `BUFFER_SAVE_AS_DRAFT` — TERAZ `false` = OSTRÝ (auto-publish). `true` = draft (na testovanie/review).
- **Cielenie pikošky:** `?slug=...` (konkrétna, aj keď je už označená). Bez slug = najstaršia v rade (cron).
- **PREVIEW:** `?preview=1` — vráti LEN text (Copy) bez kreslenia a bez Buffera. Hlavný iteračný nástroj.
- **RETRY + validácia:** SDK opakuje pri 429/529/5xx; navyše cyklus až 4× kým nie sú všetky polia A hook ≤3 riadky.
- **Slide 1:** zelené len kľúčové slová + ensureGreen (záruka 1 zeleného slova/veta) + auto-fit fontu (76→72→68→64, min 64).
- **Slidy 2-4:** ensureGreen aj tu, jednotný font, jemná fotka v pozadí (prekryv 0.78–0.88).
- **Rok:** len ak je v pikoške konkrétny (nenútiť).
- **Časy (nepárne, mimo okrúhleho náporu):** TikTok 18:33, Instagram 19:07.
- **Cron:** denne 07:00 (`vercel.json`) → najstaršia v rade, 1/deň. V OSTROM režime auto-publikuje.
  Buffer Free = 10/kanál; 1/deň sa zverejní hneď, rad sa nehromadí. Pri plnom rade cron len chybne (samoopravné).

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
- Draft vs ostrý: riadi flag `BUFFER_SAVE_AS_DRAFT` v route.ts. **TERAZ je `false` = OSTRÝ (auto-publish).**
  - `false` = OSTRÝ (`mode: customScheduled, dueAt`) → naplánuje a Buffer sám zverejní (TikTok 18:33, IG 19:07).
  - `true` = DRAFT (`mode: addToQueue, saveToDraft: true`) → nezverejní sa samo, na testovanie/review.
  - Pri novom projekte začni na `true` (testuj), prepni na `false` až keď si spokojná s dizajnom aj textami.

---

## ČO MENIŤ PRI NOVOM PROJEKTE (per-projekt)

1. Sanity project ID + dataset + write token
2. Buffer channel ID (IG, TikTok) + nový Buffer API key
3. Vercel env premenné + nový Blob store
4. Gemini systémový prompt (iný tón/obsah pre daný brand)
5. **Carousel dizajn v satori** (farby, font, logo, layout) — zaberie najviac času
6. Hashtag systém z poľa `kategoria` + filter citlivých slov

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

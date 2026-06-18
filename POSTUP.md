# POSTUP — ako robiť projekty efektívne (Curiosity Lab playbook)

> Osobná príručka. Toto si **prečítaj pred každým novým projektom** a kópiu „PRAVIDLÁ PRE CLAUDE CODE" (dole) vlož do `CLAUDE.md` každého nového projektu.

---

## 1. Štyri nástroje — kto čo robí

| Nástroj | Na čo | Príklad |
|---|---|---|
| 🧠 **Web chat** (claude.ai) | rozmýšľanie, plán, **texty** | „aký štýl účtu", popisky, hashtagy |
| 💻 **Claude Code** (terminál/VS Code) | **súbory, kód, test, git, deploy** | postaviť web, opraviť carousel, push |
| 🤝 **Cowork** | klikanie po appkách, výskum, viackrokové úlohy | prejsť účty, zbierať podklady |
| ✋ **Ručne (ty)** | rozhodnutia, **schválenie obsahu**, prihlásenia | „áno, takto", prvý post |

**Zlaté pravidlo:**
> Rozmýšľanie a texty → web chat. Súbory a kód → Claude Code. Klikanie po appkách → Cowork. Rozhodnutia → ty.
> **Nikdy „odfotím kód a pošlem do chatu."** To je zlý nástroj.

**Ako si „hovoria":** konverzácie sa NEzdieľajú. Spoločná pamäť = **súbory v repe.** Čo z chatu treba zachovať, ulož do súboru (napr. `SPEC.md`) — odvtedy to číta každý.

---

## 2. Dizajn — motor vs. karoséria

- Prvý projekt = stavba **MOTORA** (pipeline + odladené chyby). Pomalá časť, ale **platí sa len raz.**
- Nový dizajn = iná **karoséria** na ten istý motor. Rýchle.
- **HTML v prehliadači ≠ finálny obrázok.** Carousel kreslí **satori** (nie prehliadač) → nepreklopí sa 1:1.
  - Predlohu sprav **rýchlo** (Canva/Figma/papier), nie 2 h ručným HTML.
  - Stavaj priamo v satori s **lokálnym náhľadom** (PNG za 5 s), laď proti predlohe.

---

## 3. Efektívna dev slučka (toto šetrí najviac času)

1. Pracuj **lokálne** (`npm run dev`, náhľadové skripty) — výsledok hneď.
2. **NEnasadzuj na Vercel kvôli testu.** Deploy je až posledný krok.
3. Pushni **až keď to funguje lokálne** → Vercel nasadí sám.

---

## 4. Postup od prázdneho priečinka

### Členenie priečinka (VŽDY rovnako)

Každý nový projekt má **dve zóny** — web (moja zóna) a podklady (tvoja dielňa):

```
NazovProjektu/
├── web/          ← Next.js web. Tu operuje Claude Code. NESAHAJ sem ručne.
├── podklady/     ← Tvoja dielňa. Sem hádž čo chceš, nič sa nepokazí.
│   ├── logo/         logo, favicon, varianty
│   ├── social/       hotové carousely, IG/TikTok náhľady
│   ├── dizajn/       Canva/Figma exporty, referencie
│   └── texty/        brief, context md, koncepty z chatu
├── POSTUP.md     ← táto príručka (skopíruj ju sem)
```

Pravidlo: súbory z chatu / ručné veci → **vždy do `podklady/`**, NIKDY do web priečinka.
Keď Claude Code potrebuje niečo z podkladov pre web (napr. logo), **skopíruje si to sám**.

### Založenie webu

```bash
mkdir projekt && cd projekt
git init
npx create-next-app@latest .
# GitHub repo -> git push
# Vercel: Import Git Repository (raz) -> odvtedy auto-deploy pri pushi
# Kľúče: vercel env add NAZOV   (alebo .env.local lokálne, NIKDY do gitu)
```

Cyklus: `dev` → funguje → `git commit && git push` → hotovo. Cron (vercel.json) až na záver.

---

## 5. Modely — čo kedy

- 🐎 **Sonnet = default.** 80 % roboty: bežné kódenie, ladenie dizajnu, texty.
- 🐢 **Opus = ťažké veci.** Debugovanie, plánovanie systému, keď sa zasekneš. Po vyriešení späť na Sonnet.
- 🐇 **Haiku = drobnosti.** Premenuj, rýchla odpoveď.

Prepínanie v Claude Code: `/model`.

---

## 6. Koľko to má trvať (večery po 4 h)

- Rovnaký projekt nanovo: **5–6 večerov.**
- **Recyklovať tento** (iný dizajn + drobné zmeny logiky): **2 večery** (+1 ak úplne iná štruktúra webu).
- Motor je hotový — platíš len karosériu a obsah.

---

## 7. Štandardy, ktoré musia platiť VŽDY

Tieto si Claude Code **nekontroluje sám od seba** — preto patria do `CLAUDE.md` (viď nižšie), nech sa dodržiavajú automaticky:

- ⚡ **Web musí byť extrémne rýchlo načítateľný.**
- 🆕 **Vždy overiť najnovšie/aktuálne postupy** (nie z pamäte modelu — pozrieť reálne verzie a dokumentáciu v projekte).
- ✅ **Po každej zmene overiť, že to funguje** (build + náhľad), nie „malo by".

---

## PRAVIDLÁ PRE CLAUDE CODE — skopíruj do `CLAUDE.md` každého projektu

```markdown
# Pravidlá projektu

## Výkon (NEPREHLIADNUTEĽNÉ) — prísny strážca
- Web musí byť extrémne rýchlo načítateľný (cieľ 1–2 s). Pri každej zmene dbaj na:
  - obrázky cez next/image, správne rozmery, formát webp/avif, lazy-load — #1 žrút rýchlosti
  - statické generovanie (SSG) kde sa dá, minimum client-side JS
  - fonty cez next/font, žiadne zbytočné závislosti
  - mobil na prvom mieste (väčšina návštev) — kontroluj mobilný layout
  - sleduj veľkosť bundlu; ak rastie, upozorni ma HNEĎ
- Cieľ Lighthouse mobil ≥ 90. Po zmene spusti build a nahlás, či sa výkon zhoršil.
- Zapoj Vercel Speed Insights (@vercel/speed-insights) — reálna rýchlosť v dashboarde.

## Aktuálnosť
- Neriaď sa pamäťou modelu. Over reálne verzie balíkov a aktuálnu
  dokumentáciu (vrátane docs v node_modules), kým píšeš kód.
- Ak je novší odporúčaný postup než ten z tréningu, použi novší a povedz mi to.

## Overovanie
- Po každej zmene: build + (ak ide o vizuál) náhľad. Nehovor „hotovo",
  kým si to neoveril. Ak test zlyhá, povedz to s výstupom.

## Ako so mnou pracuješ (som beginner, nie technička)
- PÝTAJ SA VOPRED: na začiatku väčšej úlohy mi polož NARAZ všetky otázky
  (kľudne 10–15, očíslované), kým začneš. Lepšie 10 otázok teraz než 3× prerábať.
- Mysli 2 kroky dopredu a chráň ma pred chybami, ktoré ja nevidím — zastav ma.
- Dávkuj: premysli celý súvis a urob VŠETKO naraz, nie 5 samostatných buildov.
- Upozorni na opakovanie: ak je to isté vo viacerých súboroch (napr. footer),
  povedz mi to a uprav VŠADE naraz.
- Rozsah dopredu: ak sa z „malej opravy" vykľuje veľká prestavba, ZASTAV ma
  a daj 2–3 možnosti s odhadom práce, skôr než začneme.

## Bezpečnosť (chráň ma)
- Ak na screenshote vidíš API kľúč, token, heslo, adresu, email či billing —
  UPOZORNI ma hneď v prvej vete a poraď čo s tým. Nepokračuj akoby nič.
- Kľúče/heslá/platby do formulárov NIKDY nezadávaj za mňa — daj mi postup.

## Deploy (záväzné poradie)
- Oprava lokálne → build (počkať na ✓) → push → Vercel „Ready" → až POTOM test produkcie.
- Env premenné vo Verceli platia až po REDEPLOYI (zmena kľúča bez redeploy = stará verzia).
- Príkazy dávaj ako JEDEN riadok spojený cez `&&`, nech sa pri kopírovaní nezlepia.

## Pracovný štýl
- Testuj lokálne, nenasadzuj kvôli testu. Pushuj až keď to funguje.
- Súbory z chatu nikdy neukladaj priamo do projektu — len cez Edit/Write nástroje.
- Záchranná sieť: po každom FUNKČNOM kroku sprav git commit (lokálny bod návratu).
  Pushuj (= deploy) len keď to poviem. Vždy tak máš kam sa vrátiť.
- Jeden projekt = jedna Claude Code session naraz (nie dve okná súčasne).
- Na začiatku projektu si zapíš jeho stack do tejto sekcie (framework, CMS, hosting…).
```
```

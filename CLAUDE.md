@AGENTS.md

# Pravidlá projektu

## Výkon (NEPREHLIADNUTEĽNÉ) — prísny strážca
- Web musí byť extrémne rýchlo načítateľný (cieľ načítania 1–2 s). Pri každej zmene dbaj na:
  - obrázky cez next/image, správne rozmery, formát webp/avif, lazy-load — obrázky sú #1 žrút rýchlosti
  - statické generovanie (SSG) kde sa dá, minimum client-side JS
  - fonty cez next/font, žiadne zbytočné závislosti
  - mobil na prvom mieste (väčšina návštev) — kontroluj mobilný layout
  - sleduj veľkosť bundlu; ak rastie, upozorni ma HNEĎ
- Cieľ Lighthouse mobil ≥ 90. Po každej zmene spusti build a nahlás, či sa
  výkon/veľkosť zhoršili. Ak klesne, zastav ma skôr než pokračujeme.
- Speed Insights (@vercel/speed-insights) je zapojený v layout.tsx — reálnu rýchlosť
  sledujeme vo Vercel dashboarde.

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

## Social automatizácia
- Ak ide o social/carousel projekt, riaď sa `SOCIAL-AUTOMATIZACIA.md` (motor + schválený dizajn).

## Pracovný štýl
- Testuj lokálne, nenasadzuj kvôli testu. Pushuj až keď to funguje.
- Súbory z chatu nikdy neukladaj priamo do projektu — len cez Edit/Write nástroje.
- Záchranná sieť: po každom FUNKČNOM kroku sprav git commit (lokálny bod návratu).
  Pushuj (= deploy) len keď to poviem. Vždy tak máš kam sa vrátiť keď sa niečo pokazí.
- Jeden projekt = jedna Claude Code session naraz. Nie dve okná/záložky súčasne
  (bijú sa o súbory a temp priečinok → chyby).

## Stack tohto projektu (Curiosity Lab)
- Next.js 16.2.7 (App Router) + React 19 + TypeScript
- CMS: Sanity 5 (next-sanity, @sanity/client, @sanity/image-url)
- Obsah AI: Gemini (@google/generative-ai, model gemini-2.5-flash)
- Carousel: satori + @resvg/resvg-js + sharp; hosting obrázkov: @vercel/blob
- Plánovanie: Buffer GraphQL API (IG + TikTok)
- Hosting: Vercel (auto-deploy z GitHubu), cron cez vercel.json
- Štýly: inline + <style> (žiadny Tailwind). styled-components je len závislosť
  Sanity studia (/studio) — do verejných stránok ho NEŤAHAJ (runtime JS navyše).
- Node 20 (viď .nvmrc).

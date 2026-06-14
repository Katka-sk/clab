import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Ochrana súkromia | Curiosity Lab',
  description:
    'Informácie o ochrane osobných údajov a používaní cookies na stránke Curiosity Lab.',
};

const styles: Record<string, CSSProperties> = {
  page: {
    background: '#0a0a0a',
    color: 'white',
    minHeight: '100vh',
    fontFamily: "'Barlow', sans-serif",
  },
  container: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '48px 24px 100px',
  },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: 'white',
    border: '2px solid #c8f135',
    borderRadius: 50,
    padding: '10px 24px',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 2,
    textDecoration: 'none',
    marginBottom: 48,
  },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 64,
    lineHeight: 1.05,
    marginBottom: 12,
  },
  accent: { color: '#c8f135' },
  updated: {
    color: '#444',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 56,
    textTransform: 'uppercase',
  },
  section: {
    paddingTop: 36,
    marginBottom: 36,
    borderTop: '1px solid #1a1a1a',
  },
  sectionLabel: {
    color: '#c8f135',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 13,
    letterSpacing: 4,
    fontWeight: 700,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 28,
    letterSpacing: 1,
    marginBottom: 16,
  },
  p: {
    color: '#999',
    fontSize: 15,
    lineHeight: 1.8,
    marginBottom: 16,
  },
  ul: {
    color: '#999',
    fontSize: 15,
    lineHeight: 1.8,
    paddingLeft: 22,
    marginBottom: 16,
  },
  li: { marginBottom: 8 },
  email: { color: '#c8f135', textDecoration: 'none' },
};

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionLabel}>{n}</div>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

export default function OchranaSukromiaPage() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Link href="/" style={styles.back}>
          ← SPÄŤ NA HLAVNÚ STRÁNKU
        </Link>

        <h1 style={styles.title}>
          OCHRANA <span style={styles.accent}>SÚKROMIA</span>
        </h1>
        <div style={styles.updated}>Posledná aktualizácia: 14. jún 2026</div>

        <Section n="01 — ÚVOD" title="O tomto dokumente">
          <p style={styles.p}>
            Curiosity Lab (curiositylab.sk) je vzdelávací web, ktorý prináša historické fakty.
            Vašu dôvernosť berieme vážne. Táto stránka vysvetľuje, aké údaje o vás pri návšteve
            webu zbieráme, prečo to robíme a aké máte v súvislosti s tým práva podľa Nariadenia
            (EÚ) 2016/679 (GDPR) a zákona č. 18/2018 Z. z. o ochrane osobných údajov.
          </p>
        </Section>

        <Section n="02 — PREVÁDZKOVATEĽ" title="Kto spracúva vaše údaje">
          <p style={styles.p}>
            Prevádzkovateľom webovej stránky curiositylab.sk a zodpovednou osobou za spracúvanie
            osobných údajov je <strong>Aida Digital s.r.o.</strong>, so sídlom Lipová 441/70, 951
            93 Topoľčianky, IČO: 50234307, DIČ: 2120249659, IČ DPH: SK2120249659 (platiteľ DPH od
            1. 6. 2021 podľa § 4 zákona o DPH). V prípade otázok nás môžete kontaktovať e-mailom
            na{' '}
            <a href="mailto:info.curiositylab@gmail.com" style={styles.email}>
              info.curiositylab@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section n="03 — AKÉ ÚDAJE ZBIERAME" title="Spracúvané osobné údaje">
          <ul style={styles.ul}>
            <li style={styles.li}>
              <strong>Údaje o návštevnosti</strong> — pomocou nástroja Google Analytics 4
              zbieráme anonymizované údaje o tom, ako používate náš web: navštívené stránky, čas
              strávený na stránke, typ zariadenia a prehliadača, približná lokalita
              (krajina/mesto) a zdroj návštevy. Tieto údaje nevieme priradiť k vašej konkrétnej
              totožnosti.
            </li>
            <li style={styles.li}>
              <strong>E-mailová adresa</strong> — ak sa v budúcnosti prihlásite na odber
              newslettera, spracúvame vašu e-mailovú adresu za účelom zasielania noviniek. Túto
              funkciu momentálne nepoužívame, pripravujeme ju.
            </li>
            <li style={styles.li}>
              <strong>E-mailová komunikácia</strong> — ak nás kontaktujete e-mailom, spracúvame
              údaje, ktoré nám sami poskytnete (napríklad meno a e-mailová adresa), za účelom
              odpovede na vašu správu.
            </li>
          </ul>
        </Section>

        <Section n="04 — COOKIES" title="Súbory cookies">
          <p style={styles.p}>
            Cookies sú malé textové súbory, ktoré sa ukladajú do vášho prehliadača a pomáhajú nám
            pochopiť, ako web používate.
          </p>
          <ul style={styles.ul}>
            <li style={styles.li}>
              <strong>Analytické cookies (Google Analytics)</strong> — napríklad _ga a _gid,
              slúžia na meranie návštevnosti a zlepšovanie obsahu webu.
            </li>
          </ul>
          <p style={styles.p}>
            Cookies môžete kedykoľvek vymazať alebo zablokovať v nastaveniach svojho prehliadača
            (Chrome, Safari, Firefox a iné). Vypnutie cookies nemá vplyv na základné fungovanie
            webu, môže však ovplyvniť presnosť našich analytických dát.
          </p>
        </Section>

        <Section n="05 — PRÁVNY ZÁKLAD A DOBA UCHOVÁVANIA" title="Prečo a ako dlho">
          <p style={styles.p}>
            Údaje o návštevnosti spracúvame na základe nášho oprávneného záujmu na zlepšovaní
            obsahu a fungovania webu (čl. 6 ods. 1 písm. f GDPR).
          </p>
          <p style={styles.p}>
            Údaje v Google Analytics sú uchovávané po dobu 14 mesiacov, po uplynutí ktorej sa
            automaticky vymažú. E-mailovú komunikáciu uchovávame po dobu nevyhnutnú na vyriešenie
            vašej požiadavky, najviac však 24 mesiacov.
          </p>
        </Section>

        <Section n="06 — KOMU ÚDAJE POSKYTUJEME" title="Tretie strany">
          <ul style={styles.ul}>
            <li style={styles.li}>
              <strong>Google Ireland Limited</strong> — poskytovateľ nástroja Google Analytics.
            </li>
            <li style={styles.li}>
              <strong>Vercel Inc.</strong> — poskytovateľ hostingu, na ktorom web prevádzkujeme.
            </li>
            <li style={styles.li}>
              <strong>Sanity.io</strong> — systém na správu obsahu webu (nezbiera údaje o
              návštevníkoch webu).
            </li>
          </ul>
          <p style={styles.p}>
            Tieto spoločnosti spracúvajú údaje v súlade so svojimi vlastnými zásadami ochrany
            súkromia a môžu prenášať dáta aj mimo EÚ na základe štandardných zmluvných doložiek.
          </p>
        </Section>

        <Section n="07 — VAŠE PRÁVA" title="Práva dotknutej osoby">
          <ul style={styles.ul}>
            <li style={styles.li}>Právo na prístup k osobným údajom, ktoré o vás spracúvame.</li>
            <li style={styles.li}>Právo na opravu nesprávnych údajov.</li>
            <li style={styles.li}>Právo na vymazanie ("právo na zabudnutie").</li>
            <li style={styles.li}>Právo na obmedzenie spracúvania.</li>
            <li style={styles.li}>Právo na prenosnosť údajov.</li>
            <li style={styles.li}>Právo namietať proti spracúvaniu.</li>
            <li style={styles.li}>
              Právo podať sťažnosť na Úrad na ochranu osobných údajov SR (dataprotection.gov.sk).
            </li>
          </ul>
          <p style={styles.p}>
            Pre uplatnenie ktoréhokoľvek z týchto práv nás kontaktujte na{' '}
            <a href="mailto:info.curiositylab@gmail.com" style={styles.email}>
              info.curiositylab@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section n="08 — ZABEZPEČENIE A ZMENY" title="Bezpečnosť údajov">
          <p style={styles.p}>
            Vaše údaje chránime primeranými technickými a organizačnými opatreniami. Túto stránku
            môžeme z času na čas aktualizovať, napríklad v súvislosti so zmenou právnych predpisov
            alebo novými funkciami webu. O zásadných zmenách vás budeme informovať priamo na webe.
          </p>
        </Section>

        <Section n="09 — KONTAKT" title="Napíšte nám">
          <p style={styles.p}>
            V prípade akýchkoľvek otázok nás kontaktujte na:{' '}
            <a href="mailto:info.curiositylab@gmail.com" style={styles.email}>
              info.curiositylab@gmail.com
            </a>
          </p>
        </Section>
      </div>
    </div>
  );
}

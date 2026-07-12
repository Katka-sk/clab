export type ClabVideo = {
  id: string;
  nadpis: string;
  src: string;
  caption: string;
  hashtags: string;
};

// Postovacia fronta — 5 hotových videí (titulky zapečené). Poradie podľa viral
// potenciálu. Videá dočasne hostované v public/videos (neskôr presun na Vercel Blob).
export const VIDEOS: ClabVideo[] = [
  {
    id: 'radium',
    nadpis: '☠️ Rádiové dievčatá',
    src: '/videos/radium.mp4',
    caption: 'Povedali im, že je to bezpečné. Ich kosti sú rádioaktívne dodnes. ☠️',
    hashtags: '#historia #darkhistory #zaujimavosti #dejiny #history',
  },
  {
    id: 'macky',
    nadpis: '🐈‍⬛ Pápež vs. mačky',
    src: '/videos/macky.mp4',
    caption: 'Pápež vyhlásil vojnu mačkám. O sto rokov to zabilo tretinu Európy. 🐈‍⬛',
    hashtags: '#historia #darkhistory #zaujimavosti #mor #history',
  },
  {
    id: 'einstein',
    nadpis: '🧠 Einstein',
    src: '/videos/einstein.mp4',
    caption: 'Ponúkli mu, aby sa stal prezidentom. Najslávnejší vedec sveta odmietol. 🧠',
    hashtags: '#historia #einstein #zaujimavosti #dejiny #history',
  },
  {
    id: 'zelena',
    nadpis: '👗 Jedovatá zelená móda',
    src: '/videos/zelena.mp4',
    caption: 'Najkrajšia farba 19. storočia zabíjala. A ženy ju aj tak milovali. 👗☠️',
    hashtags: '#historia #darkhistory #zaujimavosti #dejiny #history',
  },
  {
    id: 'bayer',
    nadpis: '💉 Bayer heroín',
    src: '/videos/bayer.mp4',
    caption: 'Firma, čo vyrába Aspirín, kedysi predávala heroín. Deťom. Na kašeľ. 💉',
    hashtags: '#historia #zaujimavosti #darkhistory #dejiny #history',
  },

  // ── Nová várka z CuriosityLab videí (10, titulky zapečené) ──────────────
  {
    id: 'olga',
    nadpis: '🔥 Oľga Kyjevská',
    src: '/videos/olga.mp4',
    caption: 'Zavraždili jej manžela. Pomstila sa tak, že horiacimi vtákmi vypálila celé mesto. 🔥🕊️',
    hashtags: '#historia #darkhistory #zaujimavosti #dejiny #history',
  },
  {
    id: 'tanec',
    nadpis: '💃 Tanečná epidémia',
    src: '/videos/tanec.mp4',
    caption: 'Celé mesto raz tancovalo dni a noci v kuse. Niektorí od vyčerpania padli mŕtvi. 💃',
    hashtags: '#historia #zaujimavosti #darkhistory #dejiny #history',
  },
  {
    id: 'zanzibar',
    nadpis: '⏱️ Najkratšia vojna',
    src: '/videos/zanzibar.mp4',
    caption: 'Najkratšia vojna v dejinách trvala len 38 minút. Kratšie než si dáš kávu. ⏱️',
    hashtags: '#historia #zaujimavosti #dejiny #darkhistory #history',
  },
  {
    id: 'washington',
    nadpis: '🦷 Washingtonove zuby',
    src: '/videos/washington.mp4',
    caption: 'Washingtonove umelé zuby neboli z dreva. Časť pochádzala z úst jeho otrokov. 🦷',
    hashtags: '#historia #darkhistory #zaujimavosti #usa #history',
  },
  {
    id: 'papez',
    nadpis: '⛪ Mŕtvy pápež na súde',
    src: '/videos/papez.mp4',
    caption: 'Pápeža súdili 9 mesiacov po jeho smrti. Vykopali mŕtvolu a posadili ju na trón. ⛪',
    hashtags: '#historia #darkhistory #zaujimavosti #dejiny #history',
  },
  {
    id: 'moc',
    nadpis: '💰 Daň z moču',
    src: '/videos/moc.mp4',
    caption: 'Rimania zdanili aj ľudský moč. A práve tak vzniklo porekadlo „peniaze nesmrdia". 💰',
    hashtags: '#historia #zaujimavosti #rim #dejiny #history',
  },
  {
    id: 'smog',
    nadpis: '🌫️ Veľký londýnsky smog',
    src: '/videos/smog.mp4',
    caption: 'Obyčajná hmla za pár dní zabila v Londýne tisíce ľudí. A nikto si to hneď nevšimol. 🌫️',
    hashtags: '#historia #zaujimavosti #londyn #dejiny #history',
  },
  {
    id: 'waterloo',
    nadpis: '🦷 Zuby z Waterloo',
    src: '/videos/waterloo.mp4',
    caption: 'Boháči nosili zubné protézy z pravých zubov. Patrili mŕtvym vojakom z bojiska. 🦷',
    hashtags: '#historia #darkhistory #zaujimavosti #dejiny #history',
  },
  {
    id: 'obri',
    nadpis: '🪖 Postupimskí obri',
    src: '/videos/obri.mp4',
    caption: 'Kráľ dával unášať najvyšších mužov Európy. Chcel si z nich vytvoriť armádu obrov. 🪖',
    hashtags: '#historia #zaujimavosti #prusko #dejiny #history',
  },
  {
    id: 'vedro',
    nadpis: '🪣 Vojna o vedro',
    src: '/videos/vedro.mp4',
    caption: 'Dve mestá išli do skutočnej vojny. Dôvod? Jedno ukradnuté drevené vedro. 🪣',
    hashtags: '#historia #zaujimavosti #taliansko #dejiny #history',
  },
];

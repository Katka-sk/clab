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
    id: 'bayer',
    nadpis: '💉 Bayer heroín',
    src: '/videos/bayer.mp4',
    caption: 'Firma, čo vyrába Aspirín, kedysi predávala heroín. Deťom. Na kašeľ. 💉',
    hashtags: '#historia #zaujimavosti #darkhistory #dejiny #history',
  },
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
];

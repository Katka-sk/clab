export default {
  name: 'pikoska',
  title: 'Pikoška',
  type: 'document',
  fields: [
    {
      name: 'poradoveCislo',
      title: 'Poradové číslo',
      type: 'number',
    },
    {
      name: 'nadpis',
      title: 'Nadpis',
      type: 'string',
    },
    {
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: { source: 'nadpis' },
    },
    {
      name: 'kategoria',
      title: 'Kategória',
      type: 'string',
      options: {
        list: ['STAROVEK','STREDOVEK','MODERNA','KRÁĽOVSTVO','VEDA','MEDICÍNA','VOJENSTVO','KULTÚRA'],
      },
    },
    {
      name: 'perex',
      title: 'Perex (krátky popis)',
      type: 'text',
    },
    {
      name: 'obsah',
      title: 'Plný text',
      type: 'array',
      of: [{ type: 'block' }],
    },
    {
      name: 'obrazok',
      title: 'Obrázok',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'casCtania',
      title: 'Čas čítania (napr. 3 MIN)',
      type: 'string',
    },
    {
      name: 'datumPublikacie',
      title: 'Dátum publikácie',
      type: 'datetime',
    },
    {
      name: 'pioskaDna',
      title: 'Pikoška dňa?',
      type: 'boolean',
    },
  ],
}
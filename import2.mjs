import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'

const client = createClient({
  projectId: '74b6xpqc',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
})

const pikoskyData = JSON.parse(fs.readFileSync('./data.json', 'utf8'))

async function uploadImage(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath)
  const ext = path.extname(imagePath).slice(1).toLowerCase()
  const type = ext === 'png' ? 'image/png' : 'image/jpeg'
  return client.assets.upload('image', imageBuffer, {
    contentType: type,
    filename: path.basename(imagePath)
  })
}

function textToBlocks(text) {
  return text.split('\n\n').filter(p => p.trim()).map(para => ({
    _type: 'block',
    _key: Math.random().toString(36).slice(2),
    style: 'normal',
    markDefs: [],
    children: [{
      _type: 'span',
      _key: Math.random().toString(36).slice(2),
      text: para.trim(),
      marks: []
    }]
  }))
}

async function deleteExisting() {
  console.log('Mažem existujúce pikošky...')
  const existing = await client.fetch(`*[_type == "pikoska"]._id`)
  for (const id of existing) {
    await client.delete(id)
  }
  console.log(`Zmazaných ${existing.length} záznamov.`)
}

async function importAll() {
  const imagesDir = './public/images'
  await deleteExisting()
  console.log(`Importujem ${pikoskyData.length} pikoší...`)

  for (const p of pikoskyData) {
    try {
      console.log(`Nahrávam #${p.id}: ${p.nadpis}`)
      const imagePath = path.join(imagesDir, p.obrazok)
      let imageAsset = null

      if (fs.existsSync(imagePath)) {
        imageAsset = await uploadImage(imagePath)
        console.log(`  ✓ Obrázok nahraný`)
      } else {
        console.log(`  ⚠ Obrázok nenájdený: ${p.obrazok}`)
      }

      const doc = {
        _type: 'pikoska',
        poradoveCislo: p.id,
        nadpis: p.nadpis,
        slug: { _type: 'slug', current: p.slug },
        kategoria: p.kategoria,
        perex: p.perex,
        obsah: textToBlocks(p.obsah),
        casCtania: p.time,
        datumPublikacie: new Date(Date.now() - (30 - p.id) * 24 * 60 * 60 * 1000).toISOString(),
        pioskaDna: p.id === 9,
        ...(imageAsset && {
          obrazok: {
            _type: 'image',
            asset: { _type: 'reference', _ref: imageAsset._id }
          }
        }),
      }

      await client.create(doc)
      console.log(`  ✓ Pikoška vytvorená`)
    } catch (err) {
      console.error(`  ✗ Chyba pri #${p.id}:`, err.message)
    }
  }
  console.log('✅ Import hotový!')
}

importAll()

import { createClient } from '@sanity/client';
import type { MetadataRoute } from 'next';

const client = createClient({
  projectId: '74b6xpqc',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
});

const BASE_URL = 'https://curiositylab.sk';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pikoskyRaw: { slug: string; updatedAt: string }[] = await client.fetch(
    `*[_type == "pikoska"] | order(poradoveCislo asc) {
      "slug": slug.current,
      "updatedAt": _updatedAt
    }`
  );

  const pikoskyEntries: MetadataRoute.Sitemap = pikoskyRaw.map(({ slug, updatedAt }) => ({
    url: `${BASE_URL}/pikoska/${slug}`,
    lastModified: new Date(updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...pikoskyEntries,
  ];
}

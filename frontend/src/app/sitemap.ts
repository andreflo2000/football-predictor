import type { MetadataRoute } from 'next'

const LEAGUES = [
  'premier-league',
  'la-liga',
  'serie-a',
  'bundesliga',
  'ligue-1',
  'champions-league',
  'europa-league',
  'primeira-liga',
  'eredivisie',
  'championship',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: 'https://oxiano.com', lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://oxiano.com/daily', lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://oxiano.com/track-record', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://oxiano.com/despre', lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://oxiano.com/terms', lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://oxiano.com/privacy', lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const leaguePages: MetadataRoute.Sitemap = LEAGUES.map(liga => ({
    url: `https://oxiano.com/predictii/${liga}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }))

  return [...staticPages, ...leaguePages]
}

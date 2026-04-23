import type { MetadataRoute } from 'next'

const LEAGUES = [
  'premier-league',
  'la-liga',
  'serie-a',
  'bundesliga',
  'ligue-1',
  'champions-league',

  'primeira-liga',
  'eredivisie',
  'championship',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: 'https://oxiano.com', lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://oxiano.com/daily', lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://oxiano.com/blog', lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: 'https://oxiano.com/blog/cum-functioneaza-predictiile-ai-fotbal', lastModified: new Date('2026-04-22'), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://oxiano.com/blog/predictii-premier-league-model-ai', lastModified: new Date('2026-04-20'), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://oxiano.com/blog/ce-este-xg-expected-goals-fotbal', lastModified: new Date('2026-04-18'), changeFrequency: 'monthly', priority: 0.75 },
    { url: 'https://oxiano.com/blog/analiza-1x2-fotbal-ghid-complet', lastModified: new Date('2026-04-23'), changeFrequency: 'monthly', priority: 0.82 },
    { url: 'https://oxiano.com/blog/over-under-25-goluri-analiza', lastModified: new Date('2026-04-23'), changeFrequency: 'monthly', priority: 0.82 },
    { url: 'https://oxiano.com/blog/btts-both-teams-to-score-analiza', lastModified: new Date('2026-04-23'), changeFrequency: 'monthly', priority: 0.80 },
    { url: 'https://oxiano.com/blog/cum-sa-folosesti-oxiano-ghid-utilizator', lastModified: new Date('2026-04-23'), changeFrequency: 'monthly', priority: 0.78 },
    { url: 'https://oxiano.com/track-record', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://oxiano.com/ghid-piete', lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
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

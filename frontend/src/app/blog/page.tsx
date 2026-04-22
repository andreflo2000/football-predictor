'use client'
import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/blog-posts'
import { useLang } from '@/lib/LangContext'

const CATEGORY_COLORS: Record<string, string> = {
  'Metodologie': '#60a5fa',
  'Premier League': '#a78bfa',
  'La Liga': '#f59e0b',
  'Bundesliga': '#34d399',
  'Serie A': '#f87171',
  'Educație': '#22d3ee',
}

export default function BlogPage() {
  const { lang } = useLang()

  return (
    <div style={{ overflowX: 'hidden', minHeight: '100vh' }} className="app-bg grid-bg">
      <main className="max-w-3xl mx-auto px-4 py-8">

        <div className="text-center mb-10 fade-in">
          <div className="text-4xl mb-3">📝</div>
          <h1 className="font-display text-4xl text-white mb-2" style={{ letterSpacing: '0.05em' }}>
            {lang === 'en' ? 'BLOG & ANALYSIS' : 'BLOG & ANALIZE'}
          </h1>
          <p className="text-gray-500 text-sm font-mono">
            {lang === 'en'
              ? 'Football statistics, model methodology and quantitative analysis'
              : 'Statistici fotbal, metodologie model și analiză cantitativă'}
          </p>
        </div>

        <div className="space-y-4 fade-in">
          {BLOG_POSTS.map(post => {
            const color = CATEGORY_COLORS[post.category] || '#6b7280'
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <div className="card p-6 hover:border-blue-800 transition-all cursor-pointer mb-4"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-widest"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                      {post.category}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">{post.date} · {post.readTime} min</span>
                  </div>
                  <h2 className="text-white font-bold text-base leading-snug mb-2 hover:text-blue-300 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                    {post.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {post.keywords.slice(0, 3).map(kw => (
                      <span key={kw} className="text-[10px] font-mono text-gray-700 bg-gray-800/50 px-2 py-0.5 rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-gray-700 font-mono">
            {lang === 'en'
              ? 'Articles published weekly · Statistical analysis · Not betting advice'
              : 'Articole publicate săptămânal · Analiză statistică · Nu sfaturi de pariere'}
          </p>
        </div>
      </main>
    </div>
  )
}

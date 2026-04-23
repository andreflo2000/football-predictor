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
  'Ghid Piețe': '#4ade80',
  'Ghid Platformă': '#f59e0b',
  'Analiză': '#fb923c',
  'Champions League': '#fbbf24',
  'Actualitate': '#f472b6',
}

function PostCard({ post }: { post: (typeof BLOG_POSTS)[0] }) {
  const color = CATEGORY_COLORS[post.category] || '#6b7280'
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
      <div className="card p-5 hover:border-blue-800 transition-all cursor-pointer mb-3"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-widest"
            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
            {post.category}
          </span>
          <span className="text-[10px] text-gray-600 font-mono">{post.date} · {post.readTime} min</span>
        </div>
        <h2 className="text-white font-bold text-sm leading-snug mb-1 hover:text-blue-300 transition-colors">
          {post.title}
        </h2>
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
          {post.description}
        </p>
      </div>
    </Link>
  )
}

export default function BlogPage() {
  const { lang } = useLang()

  const sportsArticles = BLOG_POSTS.filter(p => p.type === 'sports')
  const educationalArticles = BLOG_POSTS.filter(p => p.type === 'educational' || !p.type)

  return (
    <div style={{ overflowX: 'hidden', minHeight: '100vh' }} className="app-bg grid-bg">
      <main className="max-w-5xl mx-auto px-4 py-8">

        <div className="text-center mb-10 fade-in">
          <div className="text-4xl mb-3">📝</div>
          <h1 className="font-display text-4xl text-white mb-2" style={{ letterSpacing: '0.05em' }}>
            {lang === 'en' ? 'BLOG & ANALYSIS' : 'BLOG & ANALIZE'}
          </h1>
          <p className="text-gray-500 text-sm font-mono">
            {lang === 'en'
              ? 'Match analysis, statistics and quantitative methodology'
              : 'Analize meciuri, statistici și metodologie cantitativă'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in">

          {/* ── COLOANA STANGA: Analize Sportive ─────────────────── */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[10px] font-bold font-mono uppercase tracking-widest"
                style={{ color: '#fb923c' }}>
                ⚽ {lang === 'en' ? 'Match Analysis' : 'Analize Meciuri'}
              </div>
              <div style={{ flex: 1, height: 1, background: 'rgba(251,146,60,0.2)' }} />
            </div>

            {sportsArticles.length === 0 ? (
              <div className="card p-8 text-center"
                style={{ border: '1px solid rgba(251,146,60,0.15)', background: 'rgba(251,146,60,0.03)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
                <div className="text-sm font-bold text-gray-400 mb-2">
                  {lang === 'en' ? 'Match analyses coming soon' : 'Analizele de meciuri vin în curând'}
                </div>
                <div className="text-xs text-gray-600 leading-relaxed">
                  {lang === 'en'
                    ? 'Daily match previews, tactical analysis and pre-match statistics will appear here.'
                    : 'Preview-uri zilnice, analize tactice și statistici pre-meci vor apărea aici.'}
                </div>
              </div>
            ) : (
              <div>
                {sportsArticles.map(post => <PostCard key={post.slug} post={post} />)}
              </div>
            )}
          </div>

          {/* ── COLOANA DREAPTA: Educație & Metodologie ──────────── */}
          <div className="lg:col-span-1">
            {/* Ghid Complet — featured */}
            <Link href="/ghid-piete" style={{ textDecoration: 'none' }}>
              <div className="mb-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,211,238,0.05) 100%)',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}>
                <div className="text-[9px] font-bold font-mono uppercase tracking-widest mb-2" style={{ color: '#4ade80' }}>
                  📋 {lang === 'en' ? 'Reference Guide' : 'Ghid de referință'}
                </div>
                <div className="text-white font-bold text-sm leading-snug mb-1">
                  {lang === 'en' ? 'All 10 Statistical Markets' : 'Toate cele 10 piețe statistice'}
                </div>
                <div className="text-gray-500 text-xs">1X2 · Over/Under · BTTS · Handicap →</div>
              </div>
            </Link>

            <div className="flex items-center gap-3 mb-3">
              <div className="text-[10px] font-bold font-mono uppercase tracking-widest" style={{ color: '#60a5fa' }}>
                🎓 {lang === 'en' ? 'Education & Methodology' : 'Educație & Metodologie'}
              </div>
            </div>
            <div style={{ borderLeft: '2px solid rgba(96,165,250,0.15)', paddingLeft: 12 }}>
              {educationalArticles.map(post => {
                const color = CATEGORY_COLORS[post.category] || '#6b7280'
                return (
                  <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                    <div className="mb-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                      style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
                        {post.category}
                      </span>
                      <div className="text-gray-300 font-semibold text-xs leading-snug mt-1.5 hover:text-white transition-colors line-clamp-2">
                        {post.title}
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono mt-1">{post.readTime} min</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-gray-700 font-mono">
            {lang === 'en'
              ? 'Statistical analysis · Not betting advice'
              : 'Analiză statistică · Nu sfaturi de pariere'}
          </p>
        </div>
      </main>
    </div>
  )
}

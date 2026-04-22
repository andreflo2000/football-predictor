import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getAllSlugs, BLOG_POSTS } from '@/lib/blog-posts'

export const revalidate = 86400 // regenerare ISR la 24h

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  if (!post) return {}
  return {
    title: `${post.title} — Oxiano Blog`,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `https://oxiano.com/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://oxiano.com/blog/${post.slug}`,
      siteName: 'Oxiano',
      locale: 'ro_RO',
      type: 'article',
      publishedTime: post.date,
    },
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const related = BLOG_POSTS.filter(p => p.slug !== post.slug).slice(0, 2)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'Oxiano', url: 'https://oxiano.com' },
    publisher: { '@type': 'Organization', name: 'Oxiano', url: 'https://oxiano.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://oxiano.com/blog/${post.slug}` },
    keywords: post.keywords.join(', '),
  }

  return (
    <div style={{ overflowX: 'hidden', minHeight: '100vh' }} className="app-bg grid-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-gray-600 mb-6 fade-in">
          <Link href="/" style={{ color: '#4b5563', textDecoration: 'none' }}>Oxiano</Link>
          <span>›</span>
          <Link href="/blog" style={{ color: '#4b5563', textDecoration: 'none' }}>Blog</Link>
          <span>›</span>
          <span className="text-gray-500 truncate">{post.category}</span>
        </div>

        {/* Header articol */}
        <div className="mb-8 fade-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-widest"
              style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
              {post.category}
            </span>
            <span className="text-[10px] text-gray-600 font-mono">{post.date} · {post.readTime} min citire</span>
          </div>
          <h1 className="font-display text-2xl text-white leading-snug mb-4" style={{ letterSpacing: '0.02em' }}>
            {post.title}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            {post.description}
          </p>
        </div>

        {/* Conținut articol */}
        <article
          className="fade-in prose-oxiano"
          style={{
            color: '#d1d5db',
            fontSize: 15,
            lineHeight: 1.8,
          }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-10 p-6 rounded-2xl fade-in"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="text-sm font-bold text-blue-400 mb-2">🔮 Încearcă predicțiile live</div>
          <p className="text-gray-500 text-xs leading-relaxed mb-4">
            Modelul descris în acest articol generează predicții pentru meciurile de azi, mâine și poimâine.
            Planul gratuit include direcția meciului (1/X/2) pentru toate ligile.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/predictii/premier-league"
              style={{ textDecoration: 'none', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
              🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League
            </Link>
            <Link href="/predictii/la-liga"
              style={{ textDecoration: 'none', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
              🇪🇸 La Liga
            </Link>
            <Link href="/daily"
              style={{ textDecoration: 'none', background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
              🎯 Analiza Zilei
            </Link>
          </div>
        </div>

        {/* Articole înrudite */}
        {related.length > 0 && (
          <div className="mt-10 fade-in">
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">Articole înrudite</div>
            <div className="space-y-3">
              {related.map(r => (
                <Link key={r.slug} href={`/blog/${r.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="card p-4 hover:border-blue-900 transition-all mb-2"
                    style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="text-[10px] text-gray-600 font-mono mb-1">{r.category} · {r.readTime} min</div>
                    <div className="text-sm font-semibold text-gray-300 leading-snug hover:text-white transition-colors">{r.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <Link href="/blog" style={{ color: '#4b5563', textDecoration: 'none', fontSize: 12, fontFamily: 'monospace' }}>
            ← Înapoi la Blog
          </Link>
        </div>

      </main>

      <style>{`
        .prose-oxiano h2 {
          color: #f3f4f6;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 2rem 0 0.75rem;
          letter-spacing: 0.02em;
        }
        .prose-oxiano h3 {
          color: #e5e7eb;
          font-size: 1rem;
          font-weight: 700;
          margin: 1.5rem 0 0.5rem;
        }
        .prose-oxiano p {
          margin-bottom: 1rem;
        }
        .prose-oxiano ul {
          list-style: none;
          padding: 0;
          margin-bottom: 1rem;
        }
        .prose-oxiano ul li {
          padding: 4px 0 4px 20px;
          position: relative;
          color: #9ca3af;
        }
        .prose-oxiano ul li::before {
          content: '·';
          position: absolute;
          left: 6px;
          color: #4ade80;
          font-weight: bold;
        }
        .prose-oxiano strong {
          color: #f9fafb;
          font-weight: 700;
        }
        .prose-oxiano a {
          color: #60a5fa;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  )
}

export const dynamic = 'force-dynamic';

import { getLatestArticles, getSpotlightArticles } from "@/lib/db";
import Link from "next/link";
import type { Article } from "@/lib/db";

interface NewsPageProps {
  searchParams: Promise<{ page?: string }>;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function thumbUrl(article: Article) {
  return (
    article.thumbnail ||
    `https://placehold.co/640x360/1A0A00/FFF8EE?text=${encodeURIComponent(article.title.slice(0, 14))}`
  );
}

// ── Lead article card (hero) ──────────────────────────────────────────────────

function LeadArticle({ article }: { article: Article }) {
  return (
    <Link href={`/news/${article.slug}`} className="block group relative overflow-hidden rounded-xl shadow-xl"
          style={{ minHeight: 380 }}>
      {/* Backdrop */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbUrl(article)}
        alt={article.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        style={{ opacity: 0.6 }}
      />
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to top, #0d0505 0%, rgba(13,5,5,0.6) 50%, rgba(13,5,5,0.1) 100%)" }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-8">
        <div className="flex items-center gap-3 mb-3">
          {article.isSpotlight ? (
            <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded"
                  style={{ backgroundColor: "#EF4832", color: "white" }}>
              ★ Featured
            </span>
          ) : null}
          {article.filmTitle && (
            <span className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#D4AF37" }}>
              {article.filmTitle}
            </span>
          )}
        </div>

        <h2
          className="text-3xl font-bold text-white leading-tight mb-3 group-hover:text-dishoom-gold transition-colors"
          style={{ fontFamily: "var(--font-display)", maxWidth: "36rem" }}
        >
          {article.title}
        </h2>

        {article.description && (
          <p className="text-sm leading-relaxed mb-3 line-clamp-2"
             style={{ color: "rgba(255,255,255,0.65)", maxWidth: "32rem" }}>
            {article.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          {article.celebrity && <span>{article.celebrity}</span>}
          <span>{formatDate(article.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

// ── Article card (grid) ───────────────────────────────────────────────────────

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/news/${article.slug}`} className="block group">
      {/* Thumbnail */}
      <div className="relative overflow-hidden rounded-lg mb-3 shadow-md group-hover:shadow-lg transition-shadow"
           style={{ aspectRatio: "16/9" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbUrl(article)}
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {article.isSpotlight ? (
          <div className="absolute top-2 left-2">
            <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                  style={{ backgroundColor: "#EF4832", color: "white" }}>
              Featured
            </span>
          </div>
        ) : null}
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {article.filmTitle && (
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#EF4832" }}>
            {article.filmTitle}
          </span>
        )}
        {article.celebrity && !article.filmTitle && (
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{article.celebrity}</span>
        )}
      </div>

      {/* Title */}
      <h3
        className="font-bold leading-snug mb-1.5 group-hover:text-dishoom-red transition-colors line-clamp-2"
        style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "rgba(255,255,255,0.9)" }}
      >
        {article.title}
      </h3>

      {article.description && (
        <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "rgba(255,255,255,0.5)" }}>{article.description}</p>
      )}

      <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>{formatDate(article.createdAt)}</p>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;

  const spotlight = getSpotlightArticles(1, 1);
  const allArticles = getLatestArticles(page, 16);

  // Don't double-show the spotlight article in the grid
  const leadArticle = spotlight[0] ?? allArticles[0];
  const gridArticles = allArticles.filter((a) => a.id !== leadArticle?.id);

  return (
    <div>
      {/* Banner */}
      <div className="py-10 px-6" style={{ background: "#0d0505", borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p className="text-dishoom-gold text-xs font-bold uppercase tracking-widest mb-2">Dishoom</p>
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Bollywood News
          </h1>
          <p className="text-white/40 mt-1 text-sm uppercase tracking-widest">
            Reviews · Gossip · Features
          </p>
        </div>
      </div>

      <div className="px-6 py-8" style={{ maxWidth: 1200, margin: "0 auto" }}>
        {allArticles.length === 0 ? (
          <p className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>No articles yet — check back soon.</p>
        ) : (
          <>
            {/* Lead article */}
            {leadArticle && page === 1 && (
              <div className="mb-10">
                <LeadArticle article={leadArticle} />
              </div>
            )}

            {/* Divider */}
            {page === 1 && gridArticles.length > 0 && (
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.1)" }} />
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Latest Stories</p>
                <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.1)" }} />
              </div>
            )}

            {/* Article grid */}
            {gridArticles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                {gridArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-center gap-3 pt-6" style={{ borderTop: "1px solid rgba(212,175,55,0.2)" }}>
              {page > 1 && (
                <Link
                  href={`/news?page=${page - 1}`}
                  className="px-4 py-2 text-sm font-medium rounded transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.75)" }}
                >
                  ← Previous
                </Link>
              )}
              {allArticles.length === 16 && (
                <Link
                  href={`/news?page=${page + 1}`}
                  className="px-5 py-2 text-sm font-bold uppercase tracking-wide text-white rounded transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#EF4832" }}
                >
                  More stories →
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

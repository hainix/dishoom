import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import Link from "next/link";
import type { Article } from "@/lib/db";

interface NewsArticlePageProps {
  params: Promise<{ slug: string }>;
}

function getArticleBySlug(slug: string): Article | null {
  const db = getDb();
  return (
    (db
      .prepare(
        `SELECT a.id, a.title, a.slug, a.description, a.content, a.thumbnail, a.celebrity,
                a.is_spotlight as isSpotlight, a.created_at as createdAt,
                a.film_id as filmId, f.title as filmTitle, f.slug as filmSlug
         FROM articles a
         LEFT JOIN films f ON a.film_id = f.id
         WHERE a.slug = ?`
      )
      .get(slug) as Article | undefined) ?? null
  );
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

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 380, background: "#0d0505" }}>
        {article.thumbnail ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.thumbnail}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.35 }}
            />
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to top, #0d0505 0%, rgba(13,5,5,0.55) 55%, rgba(13,5,5,0.1) 100%)" }}
            />
          </>
        ) : (
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 60% 40%, #2d1200 0%, #0d0505 70%)" }}
          />
        )}

        <div className="relative z-10 flex flex-col justify-end h-full"
             style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 40px" }}>
          <Link href="/news" className="inline-flex items-center gap-1 text-xs font-medium mb-6"
                style={{ color: "rgba(255,255,255,0.45)" }}>
            ← News
          </Link>

          {/* Tags */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {article.isSpotlight ? (
              <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded"
                    style={{ backgroundColor: "#EF4832", color: "white" }}>
                ★ Featured
              </span>
            ) : null}
            {article.filmTitle && article.filmSlug && (
              <Link href={`/film/${article.filmSlug}`}
                    className="text-xs font-bold uppercase tracking-widest hover:underline"
                    style={{ color: "#D4AF37" }}>
                {article.filmTitle}
              </Link>
            )}
            {article.celebrity && (
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                {article.celebrity}
              </span>
            )}
          </div>

          <h1
            className="font-bold text-white leading-tight mb-4"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
          >
            {article.title}
          </h1>

          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            {formatDate(article.createdAt)}
          </p>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 64px" }}>
        {article.description && (
          <p className="text-xl leading-relaxed text-gray-600 mb-8 italic border-l-4 pl-5"
             style={{ borderColor: "#EF4832" }}>
            {article.description}
          </p>
        )}

        {article.content ? (
          <div className="space-y-5 text-gray-700 leading-relaxed" style={{ fontSize: "1rem" }}>
            {article.content.split(/\n\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Full article content coming soon.</p>
        )}

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between">
          <Link href="/news" className="text-dishoom-red text-sm hover:underline">← All news</Link>
          {article.filmTitle && article.filmSlug && (
            <Link href={`/film/${article.filmSlug}`}
                  className="text-sm font-medium text-gray-700 hover:text-dishoom-red transition-colors">
              View film: {article.filmTitle} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

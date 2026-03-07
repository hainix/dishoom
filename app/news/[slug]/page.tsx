export const dynamic = 'force-dynamic';

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

export async function generateMetadata({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  const description = article.description?.slice(0, 155) ?? article.title;

  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
      type: "article" as const,
      url: `/news/${slug}`,
      ...(article.thumbnail && {
        images: [{ url: article.thumbnail, width: 1200, height: 630, alt: article.title }],
      }),
    },
    twitter: {
      card: "summary_large_image" as const,
      title: article.title,
      description,
      ...(article.thumbnail && { images: [article.thumbnail] }),
    },
  };
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 520, background: "#0d0505" }}>
        {article.thumbnail ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.thumbnail}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.72 }}
            />
            {/* Only darken the bottom ~55% where text lives — top stays vivid */}
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to top, #0d0505 0%, rgba(13,5,5,0.88) 28%, rgba(13,5,5,0.45) 52%, transparent 75%)" }}
            />
          </>
        ) : (
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 60% 40%, #2d1200 0%, #0d0505 70%)" }}
          />
        )}

        {/* Back nav — top left, readable even over bright images */}
        <div className="relative z-10" style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px 0" }}>
          <Link href="/news" className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded"
                style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.75)", backdropFilter: "blur(6px)" }}>
            ← News
          </Link>
        </div>

        {/* Title block — anchored to bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10"
             style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 40px" }}>
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
              <span className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.55)" }}>
                {article.celebrity}
              </span>
            )}
          </div>

          <h1
            className="font-bold text-white leading-tight mb-3"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.9rem, 4vw, 3rem)", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
          >
            {article.title}
          </h1>

          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {formatDate(article.createdAt)}
          </p>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 64px" }}>
        {article.description && (
          <p className="text-xl leading-relaxed mb-8 italic border-l-4 pl-5"
             style={{ color: "rgba(255,255,255,0.7)", borderColor: "#EF4832" }}>
            {article.description}
          </p>
        )}

        {article.content ? (
          /* Content is Claude-generated only — not user input — so dangerouslySetInnerHTML is safe here */
          // eslint-disable-next-line react/no-danger
          <div
            className="article-body"
            style={{ fontSize: "1rem" }}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Full article content coming soon.</p>
        )}

        {/* Footer nav */}
        <div className="mt-12 pt-6 flex items-center justify-between" style={{ borderTop: "1px solid rgba(212,175,55,0.2)" }}>
          <Link href="/news" className="text-dishoom-red text-sm hover:underline">← All news</Link>
          {article.filmTitle && article.filmSlug && (
            <Link href={`/film/${article.filmSlug}`}
                  className="text-sm font-medium hover:text-dishoom-red transition-colors"
                  style={{ color: "rgba(255,255,255,0.75)" }}>
              View film: {article.filmTitle} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

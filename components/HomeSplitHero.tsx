import Link from "next/link";
import type { Film, Article } from "@/lib/db";
import BadgeChip from "./BadgeChip";

interface HomeSplitHeroProps {
  film: Film;
  articles: Article[];
}

function posterUrl(film: Film): string {
  if (film.posterSrc) return film.posterSrc;
  if (film.oldId) return `https://media.dishoomfilms.com.s3.amazonaws.com/film/${film.oldId}.jpg`;
  return "";
}

export default function HomeSplitHero({ film, articles }: HomeSplitHeroProps) {
  const poster = posterUrl(film);
  const backdrop = film.backdropSrc || poster;
  const badges = film.badges ? film.badges.split(",").map((b) => b.trim()).filter(Boolean).slice(0, 3) : [];

  return (
    <div style={{ borderBottom: "2px solid #D4AF37" }}>
      <div style={{ display: "flex", minHeight: 500 }}>
        {/* ── Left panel (58%) — blurred backdrop hero ── */}
        <div className="relative overflow-hidden" style={{ flex: "0 0 58%", minWidth: 0 }}>
          {/* Blurred backdrop */}
          {backdrop && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={backdrop}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(20px) brightness(0.3)", transform: "scale(1.1)" }}
            />
          )}
          {!backdrop && <div className="absolute inset-0 bg-dishoom-deep" />}

          {/* Dark gradient overlay for readability */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 100%)" }}
          />

          {/* Content */}
          <div className="relative z-10 flex items-center gap-6 h-full px-8 py-10">
            {/* Poster */}
            {poster && (
              <Link href={`/film/${film.slug}`} className="flex-shrink-0 hidden sm:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster}
                  alt={film.title}
                  className="shadow-2xl border-2 border-white/20"
                  style={{ width: 140, height: "auto", borderRadius: 4 }}
                />
              </Link>
            )}

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-dishoom-gold text-xs font-bold uppercase tracking-widest mb-2">
                Featured Film
              </p>
              <Link href={`/film/${film.slug}`}>
                <h2
                  className="text-white font-bold mb-2 leading-tight hover:text-dishoom-gold transition-colors"
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)" }}
                >
                  {film.title}
                </h2>
              </Link>
              {film.year && (
                <p className="text-gray-400 text-sm mb-3">{film.year}</p>
              )}
              {film.oneliner && (
                <p className="text-gray-300 text-sm italic mb-4 leading-relaxed" style={{ maxWidth: "28rem" }}>
                  &ldquo;{film.oneliner}&rdquo;
                </p>
              )}
              <div className="flex items-center gap-3 flex-wrap mb-4">
                {film.rating !== null && (
                  <div
                    className="px-3 py-1.5 font-bold text-xl text-white"
                    style={{
                      backgroundColor: film.rating >= 60 ? "#25E010" : film.rating >= 50 ? "#D4AF37" : "#e32222",
                      borderRadius: 4,
                    }}
                  >
                    {Math.round(film.rating)}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {badges.map((b) => (
                    <BadgeChip key={b} badge={b} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                {film.trailer && (
                  <a
                    href={`https://www.youtube.com/watch?v=${film.trailer}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 text-white transition-opacity hover:opacity-80"
                    style={{ background: "#EF4832", borderRadius: 4 }}
                  >
                    ▶ Trailer
                  </a>
                )}
                <Link
                  href={`/film/${film.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold px-4 py-2 transition-colors hover:text-dishoom-gold"
                  style={{ border: "1px solid rgba(212,175,55,0.4)", color: "rgba(255,255,255,0.8)", borderRadius: 4 }}
                >
                  Film Info →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel (42%) — latest news ── */}
        <div
          className="flex flex-col"
          style={{
            flex: "0 0 42%",
            minWidth: 0,
            background: "#0d0505",
            borderLeft: "1px solid rgba(212,175,55,0.18)",
            padding: "24px 28px",
          }}
        >
          <h3
            className="font-bold uppercase tracking-widest mb-4 pb-3"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.75rem",
              color: "#D4AF37",
              borderBottom: "1px solid rgba(212,175,55,0.2)",
            }}
          >
            Latest News
          </h3>

          <div className="flex flex-col flex-1 gap-0">
            {articles.slice(0, 3).map((article, i) => (
              <Link
                key={article.id}
                href={`/news/${article.slug}`}
                className="group flex gap-3 py-4 hover:bg-white/[0.03] -mx-2 px-2 rounded transition-colors"
                style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0" style={{ width: 72, height: 50 }}>
                  {article.thumbnail ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={article.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ borderRadius: 3 }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "#1A0A00", color: "#D4AF37", borderRadius: 3 }}
                    >
                      DF
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-dishoom-gold transition-colors mb-1"
                    style={{ color: "rgba(255,255,255,0.9)" }}
                  >
                    {article.title}
                  </p>
                  <p className="text-xs truncate" style={{ color: "rgba(212,175,55,0.55)" }}>
                    {article.celebrity && <span>{article.celebrity}</span>}
                    {article.celebrity && article.filmTitle && <span> · </span>}
                    {article.filmTitle && <span>{article.filmTitle}</span>}
                  </p>
                </div>
              </Link>
            ))}

            {articles.length === 0 && (
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No articles yet.</p>
            )}
          </div>

          <div className="mt-auto pt-4" style={{ borderTop: "1px solid rgba(212,175,55,0.1)" }}>
            <Link
              href="/news"
              className="text-sm font-semibold hover:underline"
              style={{ color: "#D4AF37" }}
            >
              View all news →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

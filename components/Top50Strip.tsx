import Link from "next/link";
import type { Film } from "@/lib/db";

interface Top50StripProps {
  films: Film[];
}

function scoreColor(r: number | null) {
  if (r === null) return "#9ca3af";
  if (r >= 60) return "#22c55e";
  if (r < 50) return "#ef4444";
  return "#D4AF37";
}

function getPoster(film: Film) {
  return (
    film.posterSrc ||
    (film.oldId
      ? `https://media.dishoomfilms.com.s3.amazonaws.com/film/${film.oldId}.jpg`
      : `https://placehold.co/48x72/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 2))}`)
  );
}

export default function Top50Strip({ films }: Top50StripProps) {
  if (films.length === 0) return null;

  return (
    <section style={{ background: "#0d0505", padding: "40px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem" }}>
        {/* Header */}
        <div className="flex items-baseline justify-between mb-5 pb-3"
          style={{ borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
          <h2
            className="font-bold uppercase tracking-wider text-white"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}
          >
            Dishoom Top 50
          </h2>
          <Link
            href="/top50"
            className="text-sm font-semibold hover:underline"
            style={{ color: "#D4AF37" }}
          >
            See Full List →
          </Link>
        </div>

        {/* 2-col ranked grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {films.map((film, i) => {
            const rank = i + 1;
            const color = scoreColor(film.rating);
            const isLeft = i % 2 === 0;
            const isLastRow = i >= films.length - 2;

            return (
              <Link
                key={film.id}
                href={`/film/${film.slug}`}
                className="group flex items-center gap-3 py-3 px-4 hover:bg-white/[0.04] transition-colors"
                style={{
                  borderBottom: isLastRow ? "none" : "1px solid rgba(212,175,55,0.08)",
                  borderRight: isLeft ? "1px solid rgba(212,175,55,0.08)" : "none",
                }}
              >
                {/* Rank numeral */}
                <span
                  className="flex-shrink-0 text-center font-black leading-none select-none"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2.5rem",
                    color: "#D4AF37",
                    width: 40,
                    opacity: 0.75,
                  }}
                >
                  {rank}
                </span>

                {/* Poster */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPoster(film)}
                  alt={film.title}
                  className="flex-shrink-0 shadow-lg"
                  style={{ width: 36, height: 54, objectFit: "cover", borderRadius: 3 }}
                />

                {/* Title + rating */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-dishoom-gold transition-colors"
                    style={{ fontFamily: "var(--font-display)", color: "rgba(255,255,255,0.9)" }}
                  >
                    {film.title}
                  </p>
                  {film.year && (
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{film.year}</p>
                  )}
                </div>

                {/* Rating badge */}
                {film.rating !== null && (
                  <div
                    className="flex-shrink-0 text-white font-black text-sm px-2 py-1"
                    style={{ backgroundColor: color, borderRadius: 3, minWidth: 36, textAlign: "center" }}
                  >
                    {Math.round(film.rating)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/top50"
            className="inline-block font-bold text-sm uppercase tracking-wide text-white px-8 py-3 hover:opacity-90 transition-opacity"
            style={{ background: "#EF4832", borderRadius: 4 }}
          >
            View Full Top 50 →
          </Link>
        </div>
      </div>
    </section>
  );
}

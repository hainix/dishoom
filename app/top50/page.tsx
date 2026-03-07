import { getTopFilms } from "@/lib/db";
import BadgeChip from "@/components/BadgeChip";
import Link from "next/link";
import type { Film } from "@/lib/db";

function scoreColor(r: number | null) {
  if (r === null) return "#9ca3af";
  if (r >= 60) return "#22c55e";
  if (r < 50) return "#ef4444";
  return "#D4AF37";
}

function scoreLabel(r: number | null) {
  if (!r) return "NR";
  if (r >= 60) return "Fresh";
  if (r >= 50) return "Mixed";
  return "Rotten";
}

function getPoster(film: Film) {
  return (
    film.posterSrc ||
    (film.oldId
      ? `https://media.dishoomfilms.com.s3.amazonaws.com/film/${film.oldId}.jpg`
      : `https://placehold.co/160x240/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 2))}`)
  );
}

// ── Reusable card for #2-50 ───────────────────────────────────────────────────

function RankCard({ film, rank, isLeft }: { film: Film; rank: number; isLeft: boolean }) {
  const color = scoreColor(film.rating);

  return (
    <Link
      href={`/film/${film.slug}`}
      className="relative overflow-hidden group block"
      style={{ minHeight: 240, borderBottom: "1px solid rgba(212,175,55,0.1)" }}
    >
      {/* Backdrop */}
      {film.backdropSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={film.backdropSrc}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ opacity: 0.38 }}
          />
        </>
      ) : (
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #1a0800 0%, #0d0505 100%)" }}
        />
      )}

      {/* Bottom-to-top dark gradient — keeps text readable */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.1) 100%)" }}
      />

      {/* Column divider */}
      {isLeft && (
        <div className="absolute right-0 top-0 bottom-0 w-px" style={{ background: "rgba(212,175,55,0.12)" }} />
      )}

      {/* Rank watermark — top right */}
      <div
        className="absolute top-3 right-4 font-black leading-none select-none pointer-events-none"
        style={{ fontFamily: "var(--font-display)", fontSize: "5rem", color: "white", opacity: 0.05 }}
      >
        {rank}
      </div>

      {/* Content — sits at bottom */}
      <div className="relative z-10 flex gap-4 items-end h-full p-5" style={{ minHeight: 240 }}>
        {/* Poster */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getPoster(film)}
          alt={film.title}
          className="flex-shrink-0 shadow-xl"
          style={{ width: 72, borderRadius: 4 }}
        />

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#D4AF37" }}>
            #{rank}
          </p>
          <h3
            className="font-bold text-white leading-tight mb-1 group-hover:text-dishoom-gold transition-colors"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}
          >
            {film.title}
          </h3>
          <div className="flex items-center gap-3 text-xs mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
            {film.year && <span>{film.year}</span>}
            {film.votes > 0 && <span>{film.votes.toLocaleString()} votes</span>}
          </div>
          {film.oneliner && (
            <p className="text-xs mb-2 line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              {film.oneliner}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-white font-black text-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {film.rating ? Math.round(film.rating) : "—"}
              <span className="text-xs font-semibold opacity-85">{scoreLabel(film.rating)}</span>
            </div>
            {film.badges && film.badges.split(",").map((b) => b.trim()).filter(Boolean).slice(0, 1).map((b) => (
              <BadgeChip key={b} badge={b} />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Top50Page() {
  const films = getTopFilms(50);
  const [first, ...ranked] = films;

  return (
    <div style={{ background: "#0d0505" }}>
      {/* ── #1 Cinematic hero ─────────────────────────────────────────────── */}
      {first && (
        <div className="relative overflow-hidden" style={{ minHeight: 440 }}>
          {first.backdropSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={first.backdropSrc}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.32 }}
              />
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(to right, #0d0505 18%, rgba(13,5,5,0.78) 48%, rgba(13,5,5,0.18) 100%)" }}
              />
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(to top, #0d0505 0%, transparent 50%)" }}
              />
            </>
          ) : (
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 70% 40%, #2d1200 0%, #0d0505 65%)" }}
            />
          )}

          {/* Rank watermark */}
          <div
            className="absolute right-6 top-1/2 -translate-y-1/2 font-black leading-none select-none hidden md:block"
            style={{ fontFamily: "var(--font-display)", fontSize: "16rem", color: "#EF4832", opacity: 0.04 }}
          >
            1
          </div>

          <div className="relative z-10 flex gap-8 items-center"
            style={{ maxWidth: 1000, margin: "0 auto", padding: "44px 28px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPoster(first)}
              alt={first.title}
              className="flex-shrink-0 hidden sm:block shadow-2xl"
              style={{ width: 180, borderRadius: 6 }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-dishoom-gold text-xs font-bold uppercase tracking-widest mb-3">
                #1 — All-time Greatest
              </p>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-black leading-none"
                  style={{ color: scoreColor(first.rating), fontFamily: "var(--font-display)", fontSize: "3.75rem" }}>
                  {first.rating ? Math.round(first.rating) : "—"}
                </span>
                <div>
                  <div className="text-sm font-bold uppercase tracking-widest" style={{ color: scoreColor(first.rating) }}>
                    {scoreLabel(first.rating)}
                  </div>
                  <div className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.28)" }}>
                    Dishoom Score
                  </div>
                </div>
              </div>
              <Link href={`/film/${first.slug}`}>
                <h2 className="font-bold text-white leading-tight mb-2 hover:text-dishoom-gold transition-colors"
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}>
                  {first.title}
                </h2>
              </Link>
              <div className="flex items-center gap-3 mb-3 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                {first.year && <span>{first.year}</span>}
                {first.votes > 0 && <span>{first.votes.toLocaleString()} votes</span>}
              </div>
              {first.badges && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {first.badges.split(",").map((b) => b.trim()).filter(Boolean).slice(0, 3).map((b) => (
                    <BadgeChip key={b} badge={b} />
                  ))}
                </div>
              )}
              {first.oneliner && (
                <p className="italic text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.52)", maxWidth: "34rem" }}>
                  &ldquo;{first.oneliner}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Gold rule ─────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: "rgba(212,175,55,0.15)" }} />

      {/* ── #2-50 — same 2-col card grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {ranked.map((film, i) => (
          <RankCard
            key={film.id}
            film={film}
            rank={i + 2}
            isLeft={i % 2 === 0}
          />
        ))}
      </div>

      <div style={{ height: 48 }} />
    </div>
  );
}

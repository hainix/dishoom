import Link from "next/link";
import type { Film } from "@/lib/db";
import BadgeChip from "./BadgeChip";

interface HeroFilmProps {
  film: Film;
}

function posterUrl(film: Film): string {
  if (film.posterSrc) return film.posterSrc;
  if (film.oldId) return `https://media.dishoomfilms.com.s3.amazonaws.com/film/${film.oldId}.jpg`;
  return "";
}

export default function HeroFilm({ film }: HeroFilmProps) {
  const poster = posterUrl(film);
  const badges = film.badges ? film.badges.split(",").map((b) => b.trim()).filter(Boolean).slice(0, 3) : [];

  return (
    <div className="relative overflow-hidden" style={{ minHeight: 380 }}>
      {/* Blurred poster background */}
      {poster && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "blur(20px) brightness(0.35)", transform: "scale(1.1)" }}
          />
        </>
      )}
      {!poster && (
        <div className="absolute inset-0 bg-dishoom-deep" />
      )}

      {/* Gold bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-dishoom-gold z-10" />

      {/* Content */}
      <div className="relative z-10 flex items-center gap-8 px-8 py-10" style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Poster */}
        {poster && (
          <Link href={`/film/${film.slug}`} className="flex-shrink-0 hidden sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster}
              alt={film.title}
              className="shadow-2xl border-2 border-white/20"
              style={{ width: 160, height: "auto", borderRadius: 4 }}
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
              className="text-white text-4xl sm:text-5xl font-bold mb-2 leading-tight hover:text-dishoom-gold transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {film.title}
            </h2>
          </Link>
          {film.year && (
            <p className="text-gray-400 text-sm mb-3">{film.year}</p>
          )}
          {film.oneliner && (
            <p className="text-gray-300 text-base italic mb-4 max-w-xl leading-relaxed">
              &ldquo;{film.oneliner}&rdquo;
            </p>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            {film.rating !== null && (
              <div
                className="px-4 py-2 font-bold text-2xl text-white"
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
        </div>
      </div>
    </div>
  );
}

import {
  getSpotlightArticles,
  getLatestArticles,
  getFilmsByStatus,
  getHeroFilm,
  getVibeStats,
  getFilmsByDecade,
} from "@/lib/db";
import FilmCard from "@/components/FilmCard";
import ArticlePost from "@/components/ArticlePost";
import SpotlightGrid from "@/components/SpotlightGrid";
import HeroFilm from "@/components/HeroFilm";
import VibeGrid from "@/components/VibeGrid";
import DecadeRail from "@/components/DecadeRail";
import Link from "next/link";
import type { Film } from "@/lib/db";
import FallbackImage from "@/components/FallbackImage";

function getPosterUrl(film: Film): string {
  if (film.posterSrc) return film.posterSrc;
  if (film.oldId) return `https://media.dishoomfilms.com.s3.amazonaws.com/film/${film.oldId}.jpg`;
  return `https://placehold.co/400x600/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 12))}`;
}

function InCinemasCard({ film }: { film: Film }) {
  const bg = film.backdropSrc ?? film.posterSrc;
  return (
    <Link href={`/film/${film.slug}`} className="block group relative overflow-hidden rounded-lg"
          style={{ aspectRatio: "16/9", background: "#1A0A00" }}>
      {bg && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={bg}
          alt={film.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0"
           style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" }} />
      {/* IN CINEMAS badge */}
      <div className="absolute top-3 left-3 text-xs font-black uppercase px-3 py-1 rounded"
           style={{ backgroundColor: "#EF4832", color: "white", letterSpacing: "0.08em" }}>
        Now Playing
      </div>
      {/* Film info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-white font-black text-xl mb-1 group-hover:text-yellow-300 transition-colors"
            style={{ fontFamily: "var(--font-display)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
          {film.title}
        </h3>
        <p className="text-white/70 text-sm line-clamp-2">{film.oneliner}</p>
        <div className="flex items-center gap-3 mt-2">
          {film.year && <span className="text-white/40 text-xs">{film.year}</span>}
          {film.stars && (
            <span className="text-white/50 text-xs">{film.stars.split(",").slice(0, 2).join(", ")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ComingSoonCard({ film }: { film: Film }) {
  return (
    <Link href={`/film/${film.slug}`} className="block group flex-shrink-0" style={{ width: 140 }}>
      <div className="relative overflow-hidden rounded" style={{ aspectRatio: "2/3" }}>
        <FallbackImage
          src={getPosterUrl(film)}
          fallbackSrc={`https://placehold.co/140x210/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 10))}`}
          alt={film.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2 right-2 text-xs font-black uppercase px-2 py-0.5 rounded"
             style={{ backgroundColor: "#D4AF37", color: "#1A0A00", letterSpacing: "0.05em" }}>
          Soon
        </div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2"
             style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }}>
          <p className="text-white text-xs leading-snug line-clamp-2">{film.oneliner}</p>
        </div>
      </div>
      <div className="pt-2">
        <p className="text-xs font-semibold leading-tight line-clamp-2"
           style={{ fontFamily: "var(--font-display)", color: "rgba(255,255,255,0.9)" }}>
          {film.title}
        </p>
        {film.year && <p className="text-xs mt-0.5" style={{ color: "#D4AF37" }}>{film.year}</p>}
      </div>
    </Link>
  );
}

export default function HomePage() {
  const hero = getHeroFilm();
  const vibeStats = getVibeStats();
  const films2000s = getFilmsByDecade(2000, 12);
  const films1990s = getFilmsByDecade(1990, 12);
  const films1980s = getFilmsByDecade(1980, 12);
  const inTheaters = getFilmsByStatus("in_theaters", 4);
  const nowStreaming = getFilmsByStatus("streaming", 8);
  const comingSoon = getFilmsByStatus("coming_soon", 6);
  const spotlightArticles = getSpotlightArticles(1, 12);
  const latestArticles = getLatestArticles(1, 10);

  const hasCurrentContent = inTheaters.length > 0 || nowStreaming.length > 0 || comingSoon.length > 0;

  return (
    <div>
      {/* 1. Hero film */}
      {hero && <HeroFilm film={hero} />}

      {/* 2. Vibe grid */}
      <VibeGrid stats={vibeStats} />

      {/* 3. Current Content — In Cinemas / Streaming / Coming Soon */}
      {hasCurrentContent && (
        <div style={{ borderTop: "1px solid rgba(212,175,55,0.2)", paddingBottom: "2rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem" }}>

            {/* IN CINEMAS */}
            {inTheaters.length > 0 && (
              <div className="pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl">🎬</span>
                  <h2 className="text-base font-black uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-display)", color: "white" }}>
                    Now In Cinemas
                  </h2>
                  <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.25)" }} />
                  <Link href="/films?status=in_theaters" className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "rgba(212,175,55,0.7)" }}>
                    All →
                  </Link>
                </div>
                <div className={`grid gap-4 ${inTheaters.length === 1 ? "grid-cols-1 max-w-2xl" : "grid-cols-1 md:grid-cols-2"}`}>
                  {inTheaters.map((film) => (
                    <InCinemasCard key={film.id} film={film} />
                  ))}
                </div>
              </div>
            )}

            {/* NOW STREAMING */}
            {nowStreaming.length > 0 && (
              <div className="pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl">📱</span>
                  <h2 className="text-base font-black uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-display)", color: "white" }}>
                    Now Streaming
                  </h2>
                  <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.25)" }} />
                  <Link href="/films?status=streaming" className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "rgba(212,175,55,0.7)" }}>
                    All →
                  </Link>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                  {nowStreaming.map((film) => (
                    <FilmCard key={film.id} film={film} statusLabel="Streaming" />
                  ))}
                </div>
              </div>
            )}

            {/* COMING SOON */}
            {comingSoon.length > 0 && (
              <div className="pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl">📅</span>
                  <h2 className="text-base font-black uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-display)", color: "white" }}>
                    Coming Soon
                  </h2>
                  <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.25)" }} />
                  <Link href="/films?status=coming_soon" className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "rgba(212,175,55,0.7)" }}>
                    All →
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {comingSoon.map((film) => (
                    <ComingSoonCard key={film.id} film={film} />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 text-center">
              <Link href="/films" className="inline-block bg-dishoom-red text-white text-sm font-bold uppercase tracking-wide px-6 py-3 hover:opacity-90 transition-opacity">
                Browse All 4,000+ Films →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4. THE VAULT — Classics divider */}
      <div style={{ borderTop: "2px solid rgba(212,175,55,0.35)", padding: "28px 1rem 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }} className="flex flex-col md:flex-row md:items-end gap-2 mb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#D4AF37" }}>
              The Dishoom Vault
            </p>
            <h2 className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
              4,000+ Classics, Ranked
            </h2>
          </div>
          <div className="flex-1 hidden md:block" />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Every Bollywood film from 1950 to 2024, with reviews, songs &amp; cast
          </p>
        </div>

        {/* Decade rails */}
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <DecadeRail decade={2000} films={films2000s} />
          <div style={{ height: 1, background: "rgba(212,175,55,0.12)", margin: "0 16px" }} />
          <DecadeRail decade={1990} films={films1990s} />
          <div style={{ height: 1, background: "rgba(212,175,55,0.12)", margin: "0 16px" }} />
          <DecadeRail decade={1980} films={films1980s} />
        </div>
      </div>

      {/* 5. Spotlight + Latest News */}
      <div style={{ borderTop: "1px solid rgba(212,175,55,0.2)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }} className="flex flex-col md:flex-row">
          {/* Spotlight */}
          <div className="p-4 md:w-1/2">
            <h2 className="text-xl font-bold mb-3 pb-2 uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)", color: "white", borderBottom: "1px solid rgba(212,175,55,0.3)" }}>
              Spotlight
            </h2>
            <SpotlightGrid articles={spotlightArticles} />
          </div>

          {/* Latest News */}
          <div className="p-4 md:w-1/2 border-t md:border-t-0"
               style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-xl font-bold mb-3 pb-2 uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)", color: "white", borderBottom: "1px solid rgba(212,175,55,0.3)" }}>
              Latest News
            </h2>
            <div className="std-posts">
              {latestArticles.map((article) => (
                <ArticlePost key={article.id} article={article} />
              ))}
              {latestArticles.length === 0 && (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>No articles yet.</p>
              )}
            </div>
            <div className="mt-4">
              <Link href="/news" className="text-dishoom-red text-sm font-medium hover:underline">
                View all news →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

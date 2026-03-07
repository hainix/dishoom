export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import {
  getSpotlightArticles,
  getLatestArticles,
  getFilmsByStatus,
  getVibeStats,
  getFilmsByDecade,
  getFeaturedSongs,
} from "@/lib/db";
import ArticlePost from "@/components/ArticlePost";
import SpotlightGrid from "@/components/SpotlightGrid";
import VibeGrid from "@/components/VibeGrid";
import DecadeRail from "@/components/DecadeRail";
import VideoPlayer from "@/components/VideoPlayer";
import Link from "next/link";
import type { Film } from "@/lib/db";
import FallbackImage from "@/components/FallbackImage";

function getPosterUrl(film: Film): string {
  if (film.posterSrc) return film.posterSrc;
  if (film.oldId) return `https://media.dishoomfilms.com.s3.amazonaws.com/film/${film.oldId}.jpg`;
  return `https://placehold.co/400x600/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 12))}`;
}

function ratingBg(rating: number): string {
  if (rating >= 60) return '#22c55e';
  if (rating < 50) return '#ef4444';
  return '#D4AF37';
}

// ── Inline server-safe components ─────────────────────────────────────────────

function SideRailCard({ film, tall = false }: { film: Film; tall?: boolean }) {
  const posterUrl = getPosterUrl(film);
  const bgUrl = film.backdropSrc ?? null;
  const placeholder = `https://placehold.co/48x72/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 4))}`;
  const badges = film.badges ? film.badges.split(',').map(b => b.trim()).filter(Boolean).slice(0, 1) : [];
  const cardH = tall ? 112 : 90;
  const posterH = tall ? 78 : 64;
  const posterW = Math.round(posterH * (2 / 3));
  return (
    <Link href={`/film/${film.slug}`} className="block group relative overflow-hidden rounded-lg mb-2"
          style={{ height: cardH, background: '#1A0A00' }}>
      {/* Background image */}
      {bgUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={bgUrl} alt="" aria-hidden
             className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
             style={{ objectPosition: 'center 25%' }} />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={posterUrl} alt="" aria-hidden
             className="absolute inset-0 w-full h-full object-cover"
             style={{ filter: 'blur(14px)', transform: 'scale(1.25)', objectPosition: 'center top' }} />
      )}
      {/* Gradient: heavy dark left, fades right so backdrop peeks through */}
      <div className="absolute inset-0"
           style={{ background: 'linear-gradient(to right, rgba(13,5,5,0.96) 0%, rgba(13,5,5,0.80) 50%, rgba(13,5,5,0.35) 100%)' }} />
      {/* Content row */}
      <div className="absolute inset-0 flex items-center gap-3 px-3">
        {/* Inset poster */}
        <FallbackImage
          src={posterUrl}
          fallbackSrc={placeholder}
          alt={film.title}
          className="object-cover rounded flex-shrink-0"
          style={{ width: posterW, height: posterH, boxShadow: '0 3px 12px rgba(0,0,0,0.7)' }}
        />
        {/* Text block */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="font-semibold leading-snug line-clamp-1 group-hover:text-yellow-300 transition-colors"
             style={{ fontSize: 13, fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.95)' }}>
            {film.title}
          </p>
          {film.oneliner && (
            <p className="mt-0.5 line-clamp-2 leading-snug"
               style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              {film.oneliner}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{film.year}</span>
            {badges.map(badge => (
              <span key={badge}
                    style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999,
                             background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)',
                             color: 'rgba(212,175,55,0.9)' }}>
                {badge}
              </span>
            ))}
          </div>
        </div>
        {/* Rating badge */}
        {film.rating !== null && (
          <div className="flex-shrink-0 font-black rounded"
               style={{ backgroundColor: ratingBg(film.rating), color: 'white',
                        fontSize: 13, padding: '5px 8px', minWidth: 34, textAlign: 'center' }}>
            {Math.round(film.rating)}
          </div>
        )}
      </div>
    </Link>
  );
}

function RailSection({ icon, label, href, children }: { icon: string; label: string; href?: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 pb-2"
           style={{ borderBottom: '1px solid rgba(212,175,55,0.25)' }}>
        <span>{icon}</span>
        <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: '#D4AF37' }}>{label}</h3>
        {href && (
          <Link href={href} className="ml-auto text-xs hover:underline"
                style={{ color: 'rgba(255,255,255,0.4)' }}>All →</Link>
        )}
      </div>
      {children}
    </div>
  );
}

const CATEGORY_PILLS = [
  { label: '🕺 Dance', value: 'dance' },
  { label: '💘 Love', value: 'love' },
  { label: '🕌 Qawwali', value: 'qawwali' },
  { label: '💃 Item', value: 'item' },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const latestArticles = getLatestArticles(1, 10);
  const leadArticle = latestArticles[0] ?? null;
  const newsGrid = latestArticles.slice(1, 4);

  const inTheaters = getFilmsByStatus('in_theaters', 4);
  const streaming = getFilmsByStatus('streaming', 8);
  const comingSoon = getFilmsByStatus('coming_soon', 4);
  const featuredSongs = getFeaturedSongs(4);
  const vibeStats = getVibeStats();
  const films2000s = getFilmsByDecade(2000, 12);
  const films1990s = getFilmsByDecade(1990, 12);
  const films1980s = getFilmsByDecade(1980, 12);
  const spotlightArticles = getSpotlightArticles(1, 12);

  return (
    <div>
      {/* ── 1. Editorial 2-column hero ──────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem' }}>
        <div className="flex flex-col lg:flex-row gap-8 py-8">

          {/* LEFT MAIN */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>

            {/* Lead Article */}
            {leadArticle && (
              <div className="mb-8">
                <Link href={`/news/${leadArticle.slug}`} className="block group">
                  {leadArticle.thumbnail ? (
                    <div className="relative overflow-hidden rounded-lg mb-3" style={{ aspectRatio: '16/9' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={leadArticle.thumbnail}
                        alt={leadArticle.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0"
                           style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)' }} />
                    </div>
                  ) : (
                    <div className="rounded-lg mb-3 flex items-center justify-center"
                         style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '3rem' }}>✦</span>
                    </div>
                  )}
                  <h2 className="font-black leading-snug mb-2 group-hover:text-yellow-300 transition-colors line-clamp-2"
                      style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'rgba(255,255,255,0.95)' }}>
                    {leadArticle.title}
                  </h2>
                  {leadArticle.description && (
                    <p className="text-sm line-clamp-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      {leadArticle.description}
                    </p>
                  )}
                  <span className="text-xs mt-2 inline-block font-semibold" style={{ color: '#EF4832' }}>Read more →</span>
                </Link>
              </div>
            )}

            {/* More Stories */}
            {newsGrid.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4 pb-2"
                     style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
                  <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: '#D4AF37' }}>
                    More Stories
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {newsGrid.map((article) => (
                    <Link key={article.id} href={`/news/${article.slug}`} className="block group">
                      {article.thumbnail ? (
                        <div className="overflow-hidden rounded mb-2" style={{ aspectRatio: '16/9' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={article.thumbnail}
                            alt={article.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="rounded mb-2 flex items-center justify-center"
                             style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)' }}>
                          <span style={{ color: 'rgba(255,255,255,0.15)' }}>✦</span>
                        </div>
                      )}
                      <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-yellow-300 transition-colors"
                          style={{ fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.9)' }}>
                        {article.title}
                      </h3>
                      {article.description && (
                        <p className="text-xs mt-1 line-clamp-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {article.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
                <div className="mt-4">
                  <Link href="/news" className="text-xs font-semibold" style={{ color: '#EF4832' }}>
                    View all news →
                  </Link>
                </div>
              </div>
            )}

            {/* Watch Now */}
            {featuredSongs.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4 pb-2"
                     style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
                  <span>🎵</span>
                  <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: '#D4AF37' }}>
                    Watch Now
                  </h2>
                  <Link href="/watch" className="ml-auto text-xs hover:underline"
                        style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Browse all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {featuredSongs.map((song) => (
                    <VideoPlayer
                      key={song.id}
                      youtubeId={song.youtubeId ?? ''}
                      title={song.title ?? 'Untitled'}
                      filmTitle={song.filmTitle}
                    />
                  ))}
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {CATEGORY_PILLS.map(({ label, value }) => (
                    <Link key={value} href={`/watch?category=${value}`}
                          className="text-xs px-3 py-1.5 rounded-full font-semibold hover:opacity-80 transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT RAIL */}
          <aside className="w-full lg:w-[340px] lg:flex-none">
            {inTheaters.length > 0 && (
              <RailSection icon="🎬" label="In Cinemas" href="/films?status=in_theaters">
                {inTheaters.map((film) => (
                  <SideRailCard key={film.id} film={film} tall />
                ))}
              </RailSection>
            )}

            {streaming.length > 0 && (
              <RailSection icon="📱" label="Now Streaming" href="/films?status=streaming">
                {streaming.map((film) => (
                  <SideRailCard key={film.id} film={film} />
                ))}
              </RailSection>
            )}

            {comingSoon.length > 0 && (
              <RailSection icon="📅" label="Coming Soon">
                {comingSoon.map((film) => (
                  <SideRailCard key={film.id} film={film} />
                ))}
              </RailSection>
            )}
          </aside>
        </div>
      </div>

      {/* ── 2. Vibe Grid ─────────────────────────────────────────────────────── */}
      <VibeGrid stats={vibeStats} />

      {/* ── 4. The Vault ─────────────────────────────────────────────────────── */}
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
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <DecadeRail decade={2000} films={films2000s} />
          <div style={{ height: 1, background: "rgba(212,175,55,0.12)", margin: "0 16px" }} />
          <DecadeRail decade={1990} films={films1990s} />
          <div style={{ height: 1, background: "rgba(212,175,55,0.12)", margin: "0 16px" }} />
          <DecadeRail decade={1980} films={films1980s} />
        </div>
      </div>

      {/* ── 5. Spotlight + Latest News ──────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(212,175,55,0.2)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }} className="flex flex-col md:flex-row">
          <div className="p-4 md:w-1/2">
            <h2 className="text-xl font-bold mb-3 pb-2 uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)", color: "white", borderBottom: "1px solid rgba(212,175,55,0.3)" }}>
              Spotlight
            </h2>
            <SpotlightGrid articles={spotlightArticles} />
          </div>
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

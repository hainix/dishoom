"use client";

import Link from "next/link";
import type { Film } from "@/lib/db";

function ratingColor(r: number | null) {
  if (r === null) return "#9ca3af";
  if (r >= 60) return "#22c55e";
  if (r < 50) return "#ef4444";
  return "#D4AF37";
}

function getPosterUrl(film: Film): string {
  if (film.posterSrc) return film.posterSrc;
  if (film.oldId)
    return `https://media.dishoomfilms.com.s3.amazonaws.com/film/${film.oldId}.jpg`;
  return `https://placehold.co/160x240/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 2))}`;
}

function DecadeCard({ film }: { film: Film }) {
  const poster = getPosterUrl(film);
  const backdrop = film.backdropSrc;
  const color = ratingColor(film.rating);

  return (
    <Link
      href={`/film/${film.slug}`}
      className="relative overflow-hidden group block"
      style={{
        aspectRatio: "16/9",
        borderRadius: 6,
        background: "#110606",
      }}
    >
      {/* Background — backdrop preferred, poster fallback */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={backdrop || poster}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        style={{ opacity: backdrop ? 0.52 : 0.28 }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = poster;
        }}
      />

      {/* Cinematic gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.05) 100%)",
        }}
      />

      {/* Hover shimmer */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "rgba(212,175,55,0.04)" }}
      />

      {/* Content anchored at bottom */}
      <div className="absolute inset-x-0 bottom-0 p-3 flex gap-2.5 items-end">
        {/* Poster thumbnail */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt={film.title}
          className="flex-shrink-0 shadow-xl"
          style={{ width: 40, aspectRatio: "2/3", objectFit: "cover", borderRadius: 3 }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Meta */}
        <div className="flex-1 min-w-0">
          {film.rating !== null && (
            <span
              className="inline-flex items-center text-white font-black text-xs px-1.5 py-0.5 rounded mb-1"
              style={{ backgroundColor: color, lineHeight: 1.4 }}
            >
              {Math.round(film.rating)}
            </span>
          )}
          <p
            className="text-white font-bold text-sm leading-tight line-clamp-1 group-hover:text-dishoom-gold transition-colors"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {film.title}
          </p>
          {film.year && (
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {film.year}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

interface DecadeRailProps {
  decade: number;
  films: Film[];
}

export default function DecadeRail({ decade, films }: DecadeRailProps) {
  if (films.length === 0) return null;

  return (
    <div className="px-4 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "#D4AF37" }}
          >
            Bollywood
          </p>
          <h2
            className="text-3xl font-bold leading-none"
            style={{ fontFamily: "var(--font-display)", color: "white" }}
          >
            {decade}s
          </h2>
        </div>
        <Link
          href={`/films?decade=${decade}&sort=rating`}
          className="text-xs font-bold uppercase tracking-widest transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}
        >
          See all →
        </Link>
      </div>

      {/* Grid */}
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
      >
        {films.slice(0, 8).map((film) => (
          <DecadeCard key={film.id} film={film} />
        ))}
      </div>
    </div>
  );
}

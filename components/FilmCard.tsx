"use client";

import Link from "next/link";
import type { Film } from "@/lib/db";

interface FilmCardProps {
  film: Film;
}

function ratingColor(r: number | null) {
  if (r === null) return "#9ca3af";
  if (r >= 60) return "#22c55e";
  if (r < 50) return "#ef4444";
  return "#D4AF37";
}

function getPosterUrl(film: Film): string {
  if (film.posterSrc) return film.posterSrc;
  if (film.oldId) return `https://media.dishoomfilms.com.s3.amazonaws.com/film/${film.oldId}.jpg`;
  return `https://placehold.co/160x240/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 12))}`;
}

export default function FilmCard({ film }: FilmCardProps) {
  return (
    <Link href={`/film/${film.slug}`} className="block group">
      {/* Poster */}
      <div
        className="relative overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300"
        style={{ aspectRatio: "2/3", borderRadius: 6 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getPosterUrl(film)}
          alt={film.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://placehold.co/160x240/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 12))}`;
          }}
        />

        {/* Rating circle */}
        {film.rating !== null && (
          <div
            className="absolute top-2 left-2 w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg"
            style={{ backgroundColor: ratingColor(film.rating) }}
          >
            {Math.round(film.rating)}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3"
             style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }}>
          {film.year && <p className="text-white/60 text-xs mb-1">{film.year}</p>}
          {film.oneliner && (
            <p className="text-white text-xs leading-snug line-clamp-3">{film.oneliner}</p>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="pt-2 pb-1">
        <p className="text-gray-900 text-xs font-semibold leading-tight line-clamp-2"
           style={{ fontFamily: "var(--font-display)" }}>
          {film.title}
        </p>
        {film.year && <p className="text-gray-400 text-xs mt-0.5">{film.year}</p>}
      </div>
    </Link>
  );
}

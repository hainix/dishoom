"use client";

import Link from "next/link";
import type { Film } from "@/lib/db";

interface MovieBoxProps {
  film: Film;
}

function ratingColor(rating: number | null): string {
  if (rating === null) return "#737373";
  if (rating >= 60) return "#25E010";
  if (rating < 50) return "#e32222";
  return "#737373";
}

function posterUrl(film: Film): string {
  if (film.posterSrc) return film.posterSrc;
  // Fallback to S3 URL pattern from original site
  if (film.oldId) {
    return `https://media.dishoomfilms.com.s3.amazonaws.com/film/${film.oldId}.jpg`;
  }
  return "/placeholder-poster.jpg";
}

export default function MovieBox({ film }: MovieBoxProps) {
  return (
    <Link href={`/film/${film.slug}`}>
      <div className="movie-box">
        {/* Rating badge top-left */}
        {film.rating !== null && (
          <div
            className="trend_num_box absolute top-0 left-0 z-30 px-3 py-2 text-white font-bold text-lg"
            style={{ backgroundColor: ratingColor(film.rating) }}
          >
            {Math.round(film.rating)}
          </div>
        )}

        {/* Poster image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl(film)}
          alt={film.title}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/200x182/454545/ffffff?text=${encodeURIComponent(film.title.slice(0, 15))}`;
          }}
        />

        {/* Movie title overlay — always visible at bottom */}
        <div
          className="movie_title_overlay absolute bottom-0 left-0 w-full text-center text-white z-20 px-2 py-2 text-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
        >
          {film.title}
        </div>

        {/* Full caption — slides down on hover */}
        <div className="caption full-caption">
          <h3 className="font-bold text-sm mb-1">{film.title}</h3>
          {film.year && <p className="text-xs text-gray-300 mb-1">{film.year}</p>}
          {film.oneliner && (
            <p className="text-xs leading-tight line-clamp-4">{film.oneliner}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

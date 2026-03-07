"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { SongWithFilm } from "@/lib/db";

interface WatchPlayerProps {
  songs: SongWithFilm[];
  category: string;
  categoryLabel: string;
  total: number;
  page: number;
  totalPages: number;
}

export default function WatchPlayer({
  songs,
  category,
  categoryLabel,
  total,
  page,
  totalPages,
}: WatchPlayerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const activeSong = songs[activeIndex];

  // Scroll active song into view in the playlist
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  const selectSong = useCallback((i: number) => {
    setActiveIndex(i);
    setIsPlaying(true);
  }, []);

  const prev = useCallback(() => {
    if (activeIndex > 0) selectSong(activeIndex - 1);
  }, [activeIndex, selectSong]);

  const next = useCallback(() => {
    if (activeIndex < songs.length - 1) selectSong(activeIndex + 1);
  }, [activeIndex, songs.length, selectSong]);

  // Keyboard navigation
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [prev, next]);

  if (!activeSong) return null;

  const thumbUrl = `https://img.youtube.com/vi/${activeSong.youtubeId}/hqdefault.jpg`;

  return (
    <div className="flex flex-col lg:flex-row" style={{ height: "100%", minHeight: 0 }}>

      {/* ── Left: player + info ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col" style={{ background: "#0d0505" }}>

        {/* Player */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%", height: 0 }}>
          {isPlaying ? (
            <iframe
              key={activeSong.id}
              src={`https://www.youtube.com/embed/${activeSong.youtubeId}?autoplay=1&rel=0`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
              title={activeSong.title || ""}
            />
          ) : (
            /* Thumbnail with play prompt */
            <button
              className="absolute inset-0 w-full h-full group"
              onClick={() => setIsPlaying(true)}
              aria-label={`Play ${activeSong.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl}
                alt={activeSong.title || ""}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center"
                   style={{ background: "rgba(13,5,5,0.35)" }}>
                <div
                  className="flex items-center justify-center shadow-2xl transition-transform duration-200 group-hover:scale-110"
                  style={{ width: 72, height: 72, borderRadius: "50%", background: "#EF4832" }}
                >
                  <svg viewBox="0 0 24 24" fill="white" style={{ width: 32, height: 32, marginLeft: 4 }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Song info bar */}
        <div className="flex items-center gap-4 px-5 py-4" style={{ background: "#1a0a00" }}>
          {/* Prev / Next */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={prev}
              disabled={activeIndex === 0}
              className="flex items-center justify-center rounded transition-colors disabled:opacity-25"
              style={{ width: 36, height: 36, background: "rgba(255,255,255,0.07)" }}
              aria-label="Previous"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16, color: "#FFF8EE" }}>
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>
            <button
              onClick={next}
              disabled={activeIndex === songs.length - 1}
              className="flex items-center justify-center rounded transition-colors disabled:opacity-25"
              style={{ width: 36, height: 36, background: "rgba(255,255,255,0.07)" }}
              aria-label="Next"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16, color: "#FFF8EE" }}>
                <path d="M6 18l8.5-6L6 6v12zm2.5-6 6-4.26V16.26z" />
              </svg>
            </button>
          </div>

          {/* Title + film */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate"
               style={{ fontFamily: "var(--font-display)" }}>
              {activeSong.title || "Untitled"}
            </p>
            <Link
              href={`/film/${activeSong.filmSlug}`}
              className="text-xs truncate hover:underline"
              style={{ color: "#D4AF37" }}
            >
              {activeSong.filmTitle}
            </Link>
          </div>

          {/* Position */}
          <div className="flex-shrink-0 text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
            {activeIndex + 1} / {songs.length}
          </div>
        </div>

        {/* Category label + total */}
        <div className="px-5 py-3 text-xs flex-shrink-0 border-t"
             style={{ color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.06)", background: "#0d0505" }}>
          {categoryLabel} · {total} songs total
          <span className="ml-2 hidden sm:inline" style={{ color: "rgba(255,255,255,0.15)" }}>
            · Use ← → keys to navigate
          </span>
        </div>
      </div>

      {/* ── Right: playlist ───────────────────────────────────────────── */}
      <div
        ref={listRef}
        className="overflow-y-auto border-t lg:border-t-0 lg:border-l lg:w-80"
        style={{
          maxHeight: "50vh",
          borderColor: "rgba(255,255,255,0.08)",
          background: "#0d0505",
        }}
      >
        {/* Playlist header */}
        <div className="sticky top-0 px-4 py-3 flex items-center justify-between z-10 border-b"
             style={{ background: "#1a0a00", borderColor: "rgba(255,255,255,0.08)" }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#D4AF37" }}>
            Playlist
          </span>
          <span className="text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
            {songs.length} songs
          </span>
        </div>

        {songs.map((song, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={song.id}
              ref={isActive ? activeItemRef : undefined}
              onClick={() => selectSong(i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{
                background: isActive ? "rgba(212,175,55,0.10)" : "transparent",
                borderLeft: isActive ? "3px solid #EF4832" : "3px solid transparent",
              }}
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0 relative overflow-hidden rounded"
                   style={{ width: 64, height: 36 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${song.youtubeId}/default.jpg`}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {isActive && isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center"
                       style={{ background: "rgba(239,72,50,0.6)" }}>
                    <PlayingBars />
                  </div>
                )}
                {(!isActive || !isPlaying) && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                       style={{ background: "rgba(0,0,0,0.5)" }}>
                    <svg viewBox="0 0 24 24" fill="white" style={{ width: 16, height: 16 }}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium leading-tight truncate"
                  style={{ color: isActive ? "#FFF8EE" : "rgba(255,255,255,0.65)" }}
                >
                  {song.title || "Untitled"}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: isActive ? "#D4AF37" : "rgba(255,255,255,0.3)" }}>
                  {song.filmTitle}
                </p>
              </div>

              {/* Track number */}
              <span className="flex-shrink-0 text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.2)" }}>
                {i + 1}
              </span>
            </button>
          );
        })}

        {/* Pagination inside playlist */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-4 border-t"
               style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {page > 1 && (
              <Link
                href={`/watch?category=${encodeURIComponent(category)}&page=${page - 1}`}
                className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              >
                ← Prev
              </Link>
            )}
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Page {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/watch?category=${encodeURIComponent(category)}&page=${page + 1}`}
                className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Animated bars to show currently playing */
function PlayingBars() {
  return (
    <div className="flex items-end gap-px" style={{ height: 14 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 3,
            background: "white",
            borderRadius: 1,
            animation: `playingBar 0.8s ease-in-out ${i * 0.2}s infinite alternate`,
            height: i === 1 ? "100%" : "60%",
          }}
        />
      ))}
      <style>{`
        @keyframes playingBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

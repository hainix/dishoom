"use client";

import { useState } from "react";
import type { Song } from "@/lib/db";

const CATEGORY_COLOR: Record<string, string> = {
  dance: "#EF4832",
  love: "#e91e63",
  sad: "#6366f1",
  rain: "#0ea5e9",
  item: "#f59e0b",
  wedding: "#8b5cf6",
  devotional: "#D4AF37",
  patriotic: "#22c55e",
  qawwali: "#d97706",
};

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="white" style={{ width: 20, height: 20, marginLeft: 2 }}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function NowPlayingBars() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14, width: 14 }}>
      {[4, 10, 7, 12, 6].map((h, i) => (
        <div
          key={i}
          style={{
            width: 2,
            height: h,
            background: "#D4AF37",
            borderRadius: 1,
            animation: `bounce-bar 0.8s ${i * 0.1}s ease-in-out infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

interface SongsPlayerProps {
  songs: Song[];
}

export default function SongsPlayer({ songs }: SongsPlayerProps) {
  const playable = songs.filter((s) => s.youtubeId);
  const listOnly = songs.filter((s) => !s.youtubeId);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  if (songs.length === 0) return null;

  const activeSong = playable[activeIdx] ?? null;

  function selectSong(idx: number) {
    setActiveIdx(idx);
    setPlaying(true);
  }

  const firstCat = (song: Song) =>
    song.category?.split(",")[0]?.trim() ?? null;

  return (
    <>
      <style>{`
        @keyframes bounce-bar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      {playable.length > 0 && (
        <div
          className="flex flex-col md:flex-row gap-0 rounded-lg overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.12)" }}
        >
          {/* ── Main player ── */}
          <div className="flex-1 min-w-0 flex flex-col">
            {!playing ? (
              /* Thumbnail + play prompt */
              <div
                className="relative cursor-pointer group"
                style={{ paddingBottom: "56.25%", height: 0 }}
                onClick={() => setPlaying(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${activeSong!.youtubeId}/hqdefault.jpg`}
                  alt={activeSong!.title ?? "Song"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 flex items-center justify-center transition-colors group-hover:bg-black/30"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                >
                  <div
                    className="flex items-center justify-center shadow-2xl"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "rgba(239,72,50,0.92)",
                      boxShadow: "0 0 0 8px rgba(239,72,50,0.18)",
                    }}
                  >
                    <PlayIcon />
                  </div>
                </div>
              </div>
            ) : (
              /* Live iframe — key change forces remount + autoplay on song switch */
              <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
                <iframe
                  key={activeSong!.youtubeId}
                  src={`https://www.youtube.com/embed/${activeSong!.youtubeId}?autoplay=1`}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  title={activeSong!.title ?? "Song"}
                />
              </div>
            )}

            {/* Now playing label */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderTop: "1px solid rgba(212,175,55,0.1)" }}
            >
              {playing && <NowPlayingBars />}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "rgba(255,255,255,0.95)", fontFamily: "var(--font-display)" }}
                >
                  {activeSong!.title}
                </p>
                {firstCat(activeSong!) && (
                  <p
                    className="text-xs mt-0.5 capitalize"
                    style={{ color: CATEGORY_COLOR[firstCat(activeSong!)!] ?? "rgba(255,255,255,0.4)" }}
                  >
                    {firstCat(activeSong!)}
                  </p>
                )}
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                {activeIdx + 1} / {playable.length}
              </span>
            </div>
          </div>

          {/* ── Playlist sidebar ── */}
          <div
            className="md:w-72 flex-shrink-0 overflow-y-auto"
            style={{
              maxHeight: 360,
              borderLeft: "1px solid rgba(212,175,55,0.1)",
              scrollbarWidth: "none",
            } as React.CSSProperties}
          >
            {playable.map((song, i) => {
              const cat = firstCat(song);
              const isActive = i === activeIdx;
              return (
                <button
                  key={song.id}
                  onClick={() => selectSong(i)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 transition-colors"
                  style={{
                    background: isActive ? "rgba(212,175,55,0.08)" : "transparent",
                    borderLeft: isActive ? "2px solid #D4AF37" : "2px solid transparent",
                  }}
                >
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 relative rounded overflow-hidden" style={{ width: 60, height: 34 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${song.youtubeId}/default.jpg`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {isActive && playing ? (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.55)" }}
                      >
                        <NowPlayingBars />
                      </div>
                    ) : !isActive ? (
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.45)" }}
                      >
                        <svg viewBox="0 0 24 24" fill="white" style={{ width: 14, height: 14, marginLeft: 1 }}>
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    ) : null}
                  </div>

                  {/* Title + category */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate leading-tight"
                      style={{ color: isActive ? "#D4AF37" : "rgba(255,255,255,0.85)" }}
                    >
                      {song.title}
                    </p>
                    {cat && (
                      <p
                        className="text-xs capitalize mt-0.5"
                        style={{ color: CATEGORY_COLOR[cat] ?? "rgba(255,255,255,0.3)", fontSize: "10px" }}
                      >
                        {cat}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Non-playable songs ── */}
      {listOnly.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {listOnly.map((song) => (
            <span
              key={song.id}
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
            >
              {song.title}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

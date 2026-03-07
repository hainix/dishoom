import Link from "next/link";
import type { SongWithFilm } from "@/lib/db";
import VideoPlayer from "./VideoPlayer";

interface SongsStripProps {
  songs: SongWithFilm[];
}

export default function SongsStrip({ songs }: SongsStripProps) {
  if (songs.length === 0) return null;

  return (
    <section style={{ background: "#FFF8EE", padding: "40px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem" }}>
        {/* Header */}
        <div className="flex items-baseline justify-between mb-6 pb-3"
          style={{ borderBottom: "1px solid rgba(26,10,0,0.12)" }}>
          <h2
            className="font-bold uppercase tracking-wider"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "#1A0A00" }}
          >
            Songs to Watch
          </h2>
          <Link
            href="/watch"
            className="text-sm font-semibold hover:underline"
            style={{ color: "#EF4832" }}
          >
            Browse All →
          </Link>
        </div>

        {/* 4-up grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {songs.map((song) => (
            <VideoPlayer
              key={song.id}
              youtubeId={song.youtubeId!}
              title={song.title ?? "Song"}
              filmTitle={song.filmTitle}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

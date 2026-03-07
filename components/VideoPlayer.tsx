"use client";

import { useState } from "react";

interface VideoPlayerProps {
  youtubeId: string;
  title: string;
  filmTitle?: string;
}

export default function VideoPlayer({ youtubeId, title, filmTitle }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="relative w-full" style={{ paddingBottom: "56.25%", height: 0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            className="absolute top-0 left-0 w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
            title={title}
          />
        </div>
        {filmTitle && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{filmTitle}</p>}
        <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{title}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => setPlaying(true)}>
      <div className="relative overflow-hidden" style={{ paddingBottom: "56.25%", height: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt={title}
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
          <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      {filmTitle && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{filmTitle}</p>}
      <p className="text-xs font-medium truncate group-hover:text-dishoom-red transition-colors" style={{ color: 'rgba(255,255,255,0.9)' }}>{title}</p>
    </div>
  );
}

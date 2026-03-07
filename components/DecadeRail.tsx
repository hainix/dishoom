import Link from "next/link";
import type { Film } from "@/lib/db";
import FilmCard from "./FilmCard";

interface DecadeRailProps {
  decade: number;
  films: Film[];
}

export default function DecadeRail({ decade, films }: DecadeRailProps) {
  if (films.length === 0) return null;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-4 px-4">
        <h2
          className="text-xl font-bold text-gray-900 uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {decade}s
          <span className="text-dishoom-gold ml-2 text-base">●</span>
        </h2>
        <Link
          href={`/films?decade=${decade}&sort=rating`}
          className="text-xs text-dishoom-red font-bold uppercase tracking-wide hover:underline"
        >
          See all →
        </Link>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 px-4" style={{ width: "max-content" }}>
          {films.map((film) => (
            <div key={film.id} style={{ width: 140, flexShrink: 0 }}>
              <FilmCard film={film} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

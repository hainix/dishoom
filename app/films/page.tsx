import { getAllFilms } from "@/lib/db";
import FilmCard from "@/components/FilmCard";
import Link from "next/link";

interface FilmsPageProps {
  searchParams: Promise<{ decade?: string; minRating?: string; sort?: string; page?: string; badge?: string }>;
}

const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];

const VIBES = [
  "Dishoom Dishoom",
  "Cult Classic",
  "100% Masala",
  "No Brain Required Comedy",
  "Love/Romance",
  "Angry Young Man",
  "Blockbuster",
  "Movies with a Message",
  "Candy-Floss/NRI Romance",
  "Feel Good",
];

export default async function FilmsPage({ searchParams }: FilmsPageProps) {
  const params = await searchParams;
  const decade = params.decade ? Number(params.decade) : undefined;
  const minRating = params.minRating ? Number(params.minRating) : undefined;
  const sort = (params.sort as "rating" | "year" | "title") || "rating";
  const page = params.page ? Number(params.page) : 1;
  const badge = params.badge || undefined;

  const { films, total } = getAllFilms({ decade, minRating, sort, page, pageSize: 24, badge });
  const totalPages = Math.ceil(total / 24);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    if (decade) p.set("decade", String(decade));
    if (minRating !== undefined) p.set("minRating", String(minRating));
    if (sort !== "rating") p.set("sort", sort);
    if (page > 1) p.set("page", String(page));
    if (badge) p.set("badge", badge);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return `/films${s ? `?${s}` : ""}`;
  }

  const hasFilters = !!(decade || badge);

  return (
    <div>
      {/* Banner */}
      <div className="bg-dishoom-deep py-10 px-6">
        <div style={{ maxWidth: 1200, margin: "0 auto" }} className="flex flex-wrap items-end gap-4 justify-between">
          <div>
            <p className="text-dishoom-gold text-xs font-bold uppercase tracking-widest mb-1">Dishoom</p>
            <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              All Films
              <span className="text-white/30 text-2xl font-normal ml-3">
                {total.toLocaleString()}
              </span>
            </h1>
          </div>
          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs uppercase tracking-widest mr-1">Sort</span>
            {(["rating", "year", "title"] as const).map((s) => (
              <Link
                key={s}
                href={buildUrl({ sort: s, page: "1" })}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded transition-colors"
                style={{
                  backgroundColor: sort === s ? "#EF4832" : "rgba(255,255,255,0.08)",
                  color: sort === s ? "white" : "rgba(255,255,255,0.5)",
                }}
              >
                {s === "rating" ? "Rating" : s === "year" ? "Year" : "A–Z"}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div style={{ maxWidth: 1200, margin: "0 auto" }} className="px-6 py-3">
          {/* Vibes */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Link
              href={buildUrl({ badge: undefined, page: "1" })}
              className={`vibe-pill text-xs ${!badge ? "active" : ""}`}
            >
              All
            </Link>
            {VIBES.map((v) => (
              <Link
                key={v}
                href={buildUrl({ badge: v, page: "1" })}
                className={`vibe-pill text-xs ${badge === v ? "active" : ""}`}
              >
                {v}
              </Link>
            ))}
          </div>
          {/* Decades */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide mr-1">Era</span>
            <Link
              href={buildUrl({ decade: undefined, page: "1" })}
              className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                !decade
                  ? "bg-dishoom-deep text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </Link>
            {DECADES.map((d) => (
              <Link
                key={d}
                href={buildUrl({ decade: String(d), page: "1" })}
                className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                  decade === d
                    ? "bg-dishoom-deep text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d}s
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Active filter label */}
      {hasFilters && (
        <div className="px-6 py-3 bg-dishoom-cream/60 border-b border-gray-100" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span>Showing:</span>
            {badge && <strong>{badge}</strong>}
            {decade && <strong>{decade}s</strong>}
            <Link href="/films" className="text-dishoom-red hover:underline text-xs ml-auto">
              ✕ clear filters
            </Link>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="px-6 py-6" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))" }}>
          {films.map((film) => (
            <FilmCard key={film.id} film={film} />
          ))}
          {films.length === 0 && (
            <p className="text-gray-400 text-center py-16 col-span-full">
              No films found with these filters.
            </p>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10 pt-6 border-t border-gray-200">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                ← Previous
              </Link>
            )}
            <span className="text-sm text-gray-500">
              Page <strong>{page}</strong> of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
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

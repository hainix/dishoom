import { searchFilms } from "@/lib/db";
import FilmCard from "@/components/FilmCard";
import Link from "next/link";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() || "";
  const films = query ? searchFilms(query, 48) : [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <h1
        className="text-2xl font-bold mb-1 pb-2 uppercase tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: "white", borderBottom: "1px solid rgba(212,175,55,0.3)" }}
      >
        Search Results
      </h1>
      {query && (
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          {films.length} result{films.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
        </p>
      )}

      {films.length > 0 ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))" }}>
          {films.map((film) => <FilmCard key={film.id} film={film} />)}
        </div>
      ) : query ? (
        <div className="py-16 text-center">
          <p className="text-lg mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>No films found for &ldquo;{query}&rdquo;</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Try a different spelling or search for an actor&rsquo;s name</p>
        </div>
      ) : (
        <div className="py-16 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
          Use the search bar above to find films
        </div>
      )}

      <div className="mt-8">
        <Link href="/films" className="text-dishoom-red text-sm hover:underline">← Browse all films</Link>
      </div>
    </div>
  );
}

import { searchFilms } from "@/lib/db";
import MovieBox from "@/components/MovieBox";
import Link from "next/link";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() || "";
  const films = query ? searchFilms(query, 48) : [];

  return (
    <div className="p-4 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1 pb-2 border-b-2 border-dishoom-red uppercase tracking-wide">
        Search Results
      </h1>
      {query && (
        <p className="text-gray-500 text-sm mb-6">
          {films.length} result{films.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
        </p>
      )}

      {films.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {films.map((film) => <MovieBox key={film.id} film={film} />)}
        </div>
      ) : query ? (
        <div className="py-16 text-center">
          <p className="text-gray-500 text-lg mb-2">No films found for &ldquo;{query}&rdquo;</p>
          <p className="text-gray-400 text-sm">Try a different spelling or search for an actor&rsquo;s name</p>
        </div>
      ) : (
        <div className="py-16 text-center text-gray-400">
          Use the search bar above to find films
        </div>
      )}

      <div className="mt-8">
        <Link href="/films" className="text-dishoom-red text-sm hover:underline">← Browse all films</Link>
      </div>
    </div>
  );
}

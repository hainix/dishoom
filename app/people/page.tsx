import { getTopPeople } from "@/lib/db";
import Link from "next/link";

export default function PeoplePage() {
  const topActors = getTopPeople("actor", 40);
  const topDirectors = getTopPeople("director", 20);

  return (
    <div>
      {/* Banner */}
      <div className="bg-dishoom-deep py-12 px-6">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p className="text-dishoom-gold text-xs font-bold uppercase tracking-widest mb-2">Dishoom</p>
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Bollywood Stars
          </h1>
          <p className="text-white/40 mt-2 text-sm uppercase tracking-widest">
            Actors · Directors · Legends
          </p>
        </div>
      </div>

      <div className="px-6 py-10" style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Directors */}
        <section className="mb-14">
          <h2
            className="text-2xl font-bold text-gray-900 mb-7 pb-3"
            style={{ fontFamily: "var(--font-display)", borderBottom: "2px solid #D4AF37" }}
          >
            Directors
          </h2>
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-6">
            {topDirectors.map((person) => (
              <Link
                key={person.id}
                href={`/person/${person.slug}`}
                className="flex flex-col items-center group text-center"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 mb-2 ring-2 ring-transparent group-hover:ring-dishoom-red transition-all duration-200">
                  {person.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.imageUrl} alt={person.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                      {person.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-800 group-hover:text-dishoom-red leading-tight transition-colors line-clamp-2">
                  {person.name}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">{person.filmCount} films</span>
              </Link>
            ))}
            {topDirectors.length === 0 && (
              <p className="text-gray-400 text-sm col-span-10">No data yet.</p>
            )}
          </div>
        </section>

        {/* Actors */}
        <section>
          <h2
            className="text-2xl font-bold text-gray-900 mb-7 pb-3"
            style={{ fontFamily: "var(--font-display)", borderBottom: "2px solid #D4AF37" }}
          >
            Actors &amp; Actresses
          </h2>
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-6">
            {topActors.map((person) => (
              <Link
                key={person.id}
                href={`/person/${person.slug}`}
                className="flex flex-col items-center group text-center"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 mb-2 ring-2 ring-transparent group-hover:ring-dishoom-red transition-all duration-200">
                  {person.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.imageUrl} alt={person.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                      {person.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-800 group-hover:text-dishoom-red leading-tight transition-colors line-clamp-2">
                  {person.name}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">{person.filmCount} films</span>
              </Link>
            ))}
            {topActors.length === 0 && (
              <p className="text-gray-400 text-sm col-span-10">No data yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

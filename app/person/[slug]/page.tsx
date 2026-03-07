import { notFound } from "next/navigation";
import { getPersonBySlug, getFilmographyForPerson } from "@/lib/db";
import FilmCard from "@/components/FilmCard";
import Link from "next/link";

interface PersonPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) notFound();

  const filmography = getFilmographyForPerson(person.id, 60);
  const asDirector = filmography.filter((f) => f.role === "director");
  const asActor = filmography.filter((f) => f.role === "actor");

  return (
    <div>
      {/* Profile hero */}
      <div className="bg-dishoom-deep px-6 py-12">
        <div className="flex gap-8 items-center" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="flex-shrink-0">
            {person.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.imageUrl}
                alt={person.name}
                className="rounded-full shadow-2xl"
                style={{
                  width: 140,
                  height: 140,
                  objectFit: "cover",
                  border: "3px solid rgba(212,175,55,0.35)",
                }}
              />
            ) : (
              <div
                className="rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-3xl font-bold"
                style={{ width: 140, height: 140, border: "3px solid rgba(212,175,55,0.35)" }}
              >
                {person.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {person.type && (
              <span className="inline-block text-xs font-bold uppercase tracking-widest px-2 py-1 rounded mb-3"
                    style={{ backgroundColor: "#EF4832", color: "white" }}>
                {person.type}
              </span>
            )}
            <h1
              className="text-4xl font-bold text-white mb-2 leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {person.name}
            </h1>
            <div className="flex items-center gap-4 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span>{filmography.length} film{filmography.length !== 1 ? "s" : ""}</span>
              {person.birthplace && <span>{person.birthplace}</span>}
            </div>
            {person.bio && (
              <p className="text-sm leading-relaxed mt-3 max-w-2xl" style={{ color: "rgba(255,255,255,0.55)" }}>
                {person.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filmography */}
      <div className="px-6 py-10" style={{ maxWidth: 1200, margin: "0 auto" }}>
        {asDirector.length > 0 && (
          <section className="mb-12">
            <h2
              className="text-2xl font-bold text-gray-900 mb-6 pb-3"
              style={{ fontFamily: "var(--font-display)", borderBottom: "2px solid #D4AF37" }}
            >
              Directed ({asDirector.length})
            </h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
              {asDirector.map((f) => <FilmCard key={f.id} film={f} />)}
            </div>
          </section>
        )}

        {asActor.length > 0 && (
          <section className="mb-8">
            <h2
              className="text-2xl font-bold text-gray-900 mb-6 pb-3"
              style={{ fontFamily: "var(--font-display)", borderBottom: "2px solid #D4AF37" }}
            >
              {asDirector.length > 0 ? "Also Appeared In" : "Filmography"} ({asActor.length})
            </h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
              {asActor.map((f) => <FilmCard key={f.id} film={f} />)}
            </div>
          </section>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100">
          <Link href="/people" className="text-dishoom-red text-sm hover:underline">← All stars</Link>
        </div>
      </div>
    </div>
  );
}

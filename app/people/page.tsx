export const dynamic = 'force-dynamic';

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Bollywood Stars & Directors",
  description: "Browse Bollywood's greatest actors, directors, and screen icons from every era.",
};

import { getCuratedPeople, getTopPeople } from "@/lib/db";
import Link from "next/link";
import type { Person } from "@/lib/db";

// ── Curated lists ────────────────────────────────────────────────────────────

const LISTS = [
  {
    id: "heroes",
    emoji: "💪",
    label: "All-Time Legends",
    title: "Biggest Heroes",
    subtitle: "The male stars who carried Bollywood on their shoulders for six decades",
    slugs: [
      "amitabh-bachchan",
      "shah-rukh-khan",
      "salman-khan",
      "aamir-khan",
      "hrithik-roshan",
      "dilip-kumar",
      "rajesh-khanna",
      "dharmendra",
      "dev-anand",
      "akshay-kumar",
      "sunny-deol",
      "govinda",
    ],
    notes: [
      "The Angry Young Man",
      "King of Romance",
      "The Blockbuster Machine",
      "Mr. Perfectionist",
      "Greek God of Bollywood",
      "The Tragedy King",
      "The First Superstar",
      "He-Man of Indian Cinema",
      "The Evergreen Style Icon",
      "The Khiladi",
      "Dhai Kilo Ka Haath",
      "The Dancing Sensation",
    ],
  },
  {
    id: "bombshells",
    emoji: "✨",
    label: "Screen Goddesses",
    title: "Ultimate Bombshells",
    subtitle: "The women whose beauty and talent defined what Bollywood looked like",
    slugs: [
      "madhuri-dixit",
      "sridevi",
      "rekha",
      "hema-malini",
      "zeenat-aman",
      "deepika-padukone",
      "kareena-kapoor-khan",
      "aishwarya-rai-bachchan",
      "priyanka-chopra-jonas",
      "katrina-kaif",
      "bipasha-basu",
      "dimple-kapadia",
    ],
    notes: [
      "Dhak Dhak Girl",
      "The One and Only Queen",
      "Eternal Beauty",
      "Dream Girl",
      "The Original Bombshell",
      "The Modern Maharani",
      "The Begum",
      "Miss World Turned Icon",
      "The Global Star",
      "The Stunner",
      "The Bong Beauty",
      "Bobby's Legend",
    ],
  },
  {
    id: "villains",
    emoji: "😈",
    label: "Hall of Infamy",
    title: "Legendary Villains",
    subtitle: "You can't have great heroes without unforgettable bad guys — these are the finest",
    slugs: [
      "amjad-khan",
      "amrish-puri",
      "pran-sikand",
      "prem-chopra",
      "danny-denzongpa",
      "gulshan-grover",
      "shakti-kapoor",
      "nana-patekar",
      "sanjay-dutt",
      "kabir-bedi",
    ],
    notes: [
      "Gabbar Singh Himself",
      "Mogambo Khush Hua",
      "The Original Bad Man",
      "Prem Naam Hai Mera",
      "The Menacing Presence",
      "Bad Man",
      "Crime Master Gogo",
      "The Intense One",
      "The Dangerous Antihero",
      "International Villain",
    ],
  },
  {
    id: "item-queens",
    emoji: "💃",
    label: "Dancefloor Royalty",
    title: "Item Song Icons",
    subtitle: "One song. One sequence. Forever iconic.",
    slugs: [
      "malaika-arora",
      "helen",
      "katrina-kaif",
      "sunny-leone",
      "mallika-sherawat",
      "kareena-kapoor-khan",
      "deepika-padukone",
      "zeenat-aman",
    ],
    notes: [
      "Chaiyya Chaiyya",
      "The Original Item Girl",
      "Sheila Ki Jawani",
      "Baby Doll",
      "The Bold One",
      "Fevicol Se",
      "Desi Girl",
      "Dum Maro Dum",
    ],
  },
  {
    id: "directors",
    emoji: "🎬",
    label: "Behind The Camera",
    title: "The Visionaries",
    subtitle: "The directors who shaped the sound, look, and soul of Bollywood",
    slugs: [
      "yash-chopra",
      "mani-ratnam",
      "ramesh-sippy",
      "subhash-ghai",
      "sanjay-leela-bhansali",
      "vidhu-vinod-chopra",
      "guru-dutt",
      "raj-kapoor",
      "farah-khan",
      "karan-johar",
    ],
    notes: [
      "The Auteur of Romance",
      "The Storyteller",
      "Sholay's Mastermind",
      "The Showman",
      "The Maximalist",
      "The Craftsman",
      "Pyaasa's Poet",
      "The Greatest Showman",
      "The Blockbuster Queen",
      "Dharma's Architect",
    ],
  },
] as const;

// ── Star portrait card ────────────────────────────────────────────────────────

function StarCard({
  person,
  rank,
  note,
}: {
  person: Person & { filmCount: number };
  rank: number;
  note: string;
}) {
  const initials = person.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/person/${person.slug}`}
      className="group relative block overflow-hidden"
      style={{ aspectRatio: "3/4", borderRadius: 6, background: "#0d0505" }}
    >
      {/* Portrait */}
      {person.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.imageUrl}
          alt={person.name}
          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
          style={{ opacity: 0.88 }}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-4xl font-black"
          style={{
            background: "linear-gradient(135deg, #2d1200 0%, #0d0505 100%)",
            color: "rgba(212,175,55,0.3)",
            fontFamily: "var(--font-display)",
          }}
        >
          {initials}
        </div>
      )}

      {/* Bottom gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.0) 75%)",
        }}
      />

      {/* Top vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 35%)",
        }}
      />

      {/* Hover gold shimmer */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "rgba(212,175,55,0.06)" }}
      />

      {/* Gold hover ring */}
      <div
        className="absolute inset-0 rounded transition-all duration-300"
        style={{
          boxShadow: "inset 0 0 0 0px #D4AF37",
        }}
      />
      <div
        className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.7)" }}
      />

      {/* Rank badge — top left */}
      <div
        className="absolute top-2.5 left-2.5 text-xs font-black px-2 py-0.5 rounded"
        style={{
          backgroundColor: "rgba(212,175,55,0.18)",
          color: "#D4AF37",
          border: "1px solid rgba(212,175,55,0.4)",
          backdropFilter: "blur(4px)",
          fontFamily: "var(--font-display)",
        }}
      >
        #{rank}
      </div>

      {/* Rank watermark — top right */}
      <div
        className="absolute -top-2 right-1 font-black leading-none select-none pointer-events-none"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "5.5rem",
          color: "white",
          opacity: 0.04,
        }}
      >
        {rank}
      </div>

      {/* Content — bottom */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p
          className="font-bold text-white leading-tight line-clamp-2 group-hover:text-dishoom-gold transition-colors duration-200 mb-0.5"
          style={{ fontFamily: "var(--font-display)", fontSize: "0.875rem" }}
        >
          {person.name}
        </p>
        <p
          className="text-xs italic leading-tight line-clamp-1 mb-1"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {note}
        </p>
        <p className="text-xs font-semibold" style={{ color: "rgba(212,175,55,0.7)" }}>
          {person.filmCount} films
        </p>
      </div>
    </Link>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function CuratedSection({
  list,
  people,
}: {
  list: (typeof LISTS)[number];
  people: (Person & { filmCount: number })[];
}) {
  if (people.length === 0) return null;

  return (
    <section
      className="px-6 py-10"
      style={{ borderTop: "1px solid rgba(212,175,55,0.15)" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{list.emoji}</span>
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "#D4AF37" }}
              >
                {list.label}
              </span>
            </div>
            <h2
              className="font-bold text-white leading-none mb-2"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}
            >
              {list.title}
            </h2>
            <p className="text-sm max-w-xl" style={{ color: "rgba(255,255,255,0.4)" }}>
              {list.subtitle}
            </p>
          </div>
        </div>

        {/* Portrait grid */}
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}
        >
          {people.map((person, i) => (
            <StarCard
              key={person.id}
              person={person}
              rank={i + 1}
              note={list.notes[i] ?? ""}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Browse-all compact row ────────────────────────────────────────────────────

function BrowseGrid({
  people,
  title,
}: {
  people: (Person & { filmCount: number })[];
  title: string;
}) {
  if (people.length === 0) return null;
  return (
    <div className="mb-10">
      <h3
        className="text-lg font-bold mb-5 pb-2"
        style={{
          fontFamily: "var(--font-display)",
          color: "white",
          borderBottom: "1px solid rgba(212,175,55,0.2)",
        }}
      >
        {title}
      </h3>
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-5">
        {people.map((person) => {
          const initials = person.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <Link
              key={person.id}
              href={`/person/${person.slug}`}
              className="flex flex-col items-center group text-center"
            >
              <div
                className="w-14 h-14 rounded-full overflow-hidden mb-2 ring-2 ring-transparent group-hover:ring-dishoom-red transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                {person.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.imageUrl}
                    alt={person.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-bold text-xs"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {initials}
                  </div>
                )}
              </div>
              <span
                className="text-xs font-medium group-hover:text-dishoom-red leading-tight transition-colors line-clamp-2"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                {person.name}
              </span>
              <span className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                {person.filmCount} films
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  // Fetch all curated lists in parallel (SQLite is sync so this is just multiple calls)
  const curatedData = LISTS.map((list) => ({
    list,
    people: getCuratedPeople([...list.slugs]),
  }));

  const allActors = getTopPeople("actor", 50);
  const allDirectors = getTopPeople("director", 30);

  return (
    <div>
      {/* Banner */}
      <div
        className="relative overflow-hidden py-16 px-6"
        style={{ background: "#0d0505", borderBottom: "1px solid rgba(212,175,55,0.2)" }}
      >
        {/* Decorative large watermark */}
        <div
          className="absolute right-8 top-1/2 -translate-y-1/2 font-black leading-none select-none hidden md:block"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "14rem",
            color: "#EF4832",
            opacity: 0.03,
          }}
        >
          STARS
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#D4AF37" }}>
            Dishoom
          </p>
          <h1
            className="font-bold text-white leading-none mb-3"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
            }}
          >
            Bollywood&apos;s Finest
          </h1>
          <p className="text-sm uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            Heroes · Bombshells · Villains · Icons · Visionaries
          </p>
        </div>
      </div>

      {/* Curated editorial lists */}
      {curatedData.map(({ list, people }) => (
        <CuratedSection key={list.id} list={list} people={people} />
      ))}

      {/* Browse all */}
      <section
        className="px-6 py-12"
        style={{ borderTop: "1px solid rgba(212,175,55,0.15)" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="flex items-center gap-3 mb-8">
            <hr className="gold-rule flex-1" />
            <h2
              className="text-xl font-bold uppercase tracking-wider whitespace-nowrap"
              style={{ fontFamily: "var(--font-display)", color: "white" }}
            >
              Discover More Stars
            </h2>
            <hr className="gold-rule flex-1" />
          </div>

          <BrowseGrid people={allDirectors} title="Directors" />
          <BrowseGrid people={allActors} title="Actors &amp; Actresses" />
        </div>
      </section>
    </div>
  );
}

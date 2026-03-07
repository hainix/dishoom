/**
 * Assign badges to all films that are missing them using rule-based keyword matching.
 * Prioritises current/streaming/in_theaters films and high-rated films.
 *
 * Run: npx tsx scripts/assign-badges.ts
 */
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "prisma/dev.db");
const db = new Database(DB_PATH);

// ── Badge definitions ─────────────────────────────────────────────────────────
// Each badge has a list of keyword patterns (matched against title+plot+oneliner, lowercased).
// Checked in order; a film gets all badges whose patterns match.

const BADGE_RULES: Array<{ badge: string; patterns: string[]; titlePatterns?: string[] }> = [
  {
    badge: "Action",
    patterns: ["action", "fight", "combat", "battle", "war", "army", "soldier", "commando",
                "police", "cop", "shoot", "gun", "bomb", "explosion", "attack", "assault",
                "kick", "punch", "martial arts", "revenge", "warrior"],
    titlePatterns: ["war", "fight", "kill", "battle", "force", "shooter"],
  },
  {
    badge: "Love/Romance",
    patterns: ["love", "romance", "romantic", "wedding", "marriage", "couple", "boyfriend",
                "girlfriend", "husband", "wife", "bride", "groom", "pyaar", "mohabbat",
                "ishq", "dil se", "heartbreak", "heart", "falls in love", "lovers"],
    titlePatterns: ["love", "pyaar", "mohabbat", "ishq", "dil", "prem", "teri", "tere"],
  },
  {
    badge: "Comedy",
    patterns: ["comedy", "comic", "humor", "humour", "funny", "laughs", "slapstick",
                "farce", "lighthearted", "hijinks", "antics", "absurd", "hilarious"],
    titlePatterns: ["comedy", "fun", "funny", "masti", "dhol", "golmaal", "hera pheri",
                    "no entry", "welcome"],
  },
  {
    badge: "No Brain Required Comedy",
    patterns: ["slapstick", "over-the-top comedy", "mindless fun", "absurd comedy",
                "silly", "bumbling", "buffoon", "farcical", "screwball"],
  },
  {
    badge: "Crime",
    patterns: ["crime", "criminal", "gangster", "mafia", "underworld", "heist",
                "robbery", "thief", "theft", "smuggling", "drug", "murder", "killer",
                "hitman", "cartel", "gang", "don", "mob"],
    titlePatterns: ["don", "gangster", "crime", "thief", "daaku", "daku", "dacoit",
                    "wanted", "outlaw"],
  },
  {
    badge: "Thrilllerrr",
    patterns: ["thriller", "suspense", "mystery", "horror", "ghost", "supernatural",
                "paranormal", "demon", "evil", "curse", "haunted", "terror", "fear",
                "psychological", "serial killer", "whodunit", "twist ending"],
    titlePatterns: ["stree", "bhoot", "horror", "evil", "fear", "dark"],
  },
  {
    badge: "Drama",
    patterns: ["drama", "emotional", "family drama", "struggles", "tragedy", "tragic",
                "hardship", "suffering", "conflict", "tension", "estranged", "torn"],
  },
  {
    badge: "Angry Young Man",
    patterns: ["vigilante", "angry young", "rebel", "against the system", "injustice",
                "oppression", "corrupt", "corruption", "poor", "lower class", "slum",
                "rages against", "takes on the system", "fights corruption",
                "disillusioned", "outlaw hero"],
  },
  {
    badge: "Dishoom Dishoom",
    patterns: ["masala", "action-packed", "over-the-top action", "entertainer",
                "commercial entertainer", "punch", "fights", "villains",
                "full-on entertainer", "potboiler", "barnstorming"],
  },
  {
    badge: "100% Masala",
    patterns: ["full masala", "masala entertainer", "complete entertainer",
                "song and dance", "larger than life", "extravaganza", "spectacular",
                "spectacle"],
  },
  {
    badge: "Movies with a Message",
    patterns: ["social message", "social commentary", "social issue", "social evil",
                "poverty", "inequality", "class divide", "caste", "gender", "dowry",
                "education", "literacy", "child marriage", "corruption exposé",
                "political commentary", "communalism", "secularism", "environment",
                "based on true", "real events", "inspired by"],
  },
  {
    badge: "Patriotic",
    patterns: ["patriot", "patriotism", "nation", "national", "india", "freedom fighter",
                "independence", "british raj", "partition", "border", "kashmir",
                "armed forces", "military hero", "sacrifice for country",
                "jai hind", "bharat"],
    titlePatterns: ["india", "hindustan", "bharat", "desh", "tiranga", "veer"],
  },
  {
    badge: "Period Piece",
    patterns: ["historical", "period drama", "mughal", "empire", "maharaja", "maharani",
                "rajput", "nawab", "colonial", "18th century", "19th century",
                "medieval", "ancient india", "based on history", "set in the"],
    titlePatterns: ["mughal", "sultan", "emperor", "queen", "king", "baahubali",
                    "padmavat", "bajirao", "panipat", "tanhaji", "manikarnika",
                    "chhaava", "sam bahadur"],
  },
  {
    badge: "Candy-Floss/NRI Romance",
    patterns: ["nri", "non-resident indian", "london", "new york", "switzerland",
                "europe", "abroad", "overseas", "diaspora", "settled in",
                "living in uk", "living in us", "living in america",
                "living in london"],
    titlePatterns: ["london", "new york", "america", "bidesia"],
  },
  {
    badge: "Star-Crossed Lovers",
    patterns: ["forbidden love", "star-crossed", "cannot be together", "separated",
                "families oppose", "different religions", "different classes",
                "tragic romance", "society disapproves", "impossible love",
                "ill-fated"],
  },
  {
    badge: "Family Dysfunction",
    patterns: ["dysfunctional family", "estranged family", "broken family",
                "family conflict", "abusive father", "absent father", "runaway",
                "family secrets", "family feud", "torn family", "complicated family"],
  },
  {
    badge: "Feel Good",
    patterns: ["feel-good", "heartwarming", "uplifting", "joyful", "celebration",
                "triumph", "inspirational", "life-affirming", "sweet", "charming",
                "wholesome", "warm", "touching"],
  },
  {
    badge: "Just Do It Dramas",
    patterns: ["sports", "cricket", "hockey", "boxing", "wrestling", "athlete",
                "champion", "underdog", "tournament", "olympics", "gold medal",
                "victory", "comeback", "training", "coach"],
    titlePatterns: ["chak de", "dangal", "bhaag milkha", "sultan", "mary kom",
                    "soorma", "saala khadoos"],
  },
  {
    badge: "Parallel Cinema",
    patterns: ["parallel cinema", "art house", "new wave cinema", "realistic portrayal",
                "documentary style", "neo-realist", "shyam benegal", "govind nihalani",
                "mrinal sen", "adoor gopalakrishnan"],
  },
  {
    badge: "Timepass",
    patterns: ["timepass", "light entertainment", "family entertainer",
                "fun for all ages", "breezy", "enjoyable romp", "good fun"],
  },
  {
    badge: "Blockbuster",
    patterns: ["blockbuster", "box office smash", "box office record", "all-time hit",
                "landmark film", "iconic film", "cult status"],
  },
  {
    badge: "Hatkay",
    patterns: ["offbeat", "unconventional", "quirky", "experimental", "unusual",
                "bizarre", "surreal", "avant-garde", "genre-bending", "unique vision"],
  },
];

// ── Decade / era heuristics ───────────────────────────────────────────────────
// Films from certain eras get era-specific badges if they match patterns

const ERA_RULES: Array<{ yearFrom: number; yearTo: number; badge: string; minRating?: number }> = [
  { yearFrom: 1970, yearTo: 1985, badge: "Angry Young Man", minRating: 60 },
  { yearFrom: 1960, yearTo: 1980, badge: "Parallel Cinema", minRating: 75 },
];

// ── Known high-profile films: hardcoded badge overrides ───────────────────────
// Keyed by slug; override/supplement any rule-based assignment
const KNOWN_BADGES: Record<string, string[]> = {
  // Current streaming / theatrical
  "chhaava": ["Period Piece", "Patriotic", "Action", "Blockbuster"],
  "stree-2": ["Thrilllerrr", "Comedy", "Blockbuster", "100% Masala"],
  "kill": ["Action", "Thrilllerrr", "Crime"],
  "fighter": ["Action", "Patriotic", "Blockbuster"],
  "shaitaan": ["Thrilllerrr", "Drama"],
  "sector-36": ["Crime", "Thrilllerrr", "Drama", "Movies with a Message"],
  "lost-ladies": ["Drama", "Movies with a Message", "Crime"],
  "saiyaara": ["Love/Romance", "Drama"],
  "jewel-thief-the-heist-begins": ["Crime", "Thrilllerrr", "Action"],
  "dhoom-dhaam": ["Comedy", "Action", "Timepass"],
  "jolly-llb-3": ["Comedy", "Drama", "Movies with a Message"],
  "raid-2": ["Action", "Crime", "Drama", "Movies with a Message"],
  "sunny-sanskari-ki-tulsi-kumari": ["Love/Romance", "Comedy", "Timepass"],
  "thamma": ["Drama", "Movies with a Message"],
  "love-war": ["Action", "Love/Romance", "Blockbuster"],
  "dhurandhar-the-revenge": ["Action", "Crime", "Dishoom Dishoom"],
  "dhurandhar": ["Action", "Crime", "Dishoom Dishoom"],
  "bhooth-bangla": ["Thrilllerrr", "Comedy"],
  "king": ["Action", "Crime", "Dishoom Dishoom"],
  "ramayana": ["Period Piece", "Patriotic", "Blockbuster"],
  "border-2": ["Action", "Patriotic", "War"],
  // Classics
  "don": ["Crime", "Action", "Dishoom Dishoom", "Cult Classic"],
  "zanjeer": ["Action", "Crime", "Angry Young Man", "Blockbuster"],
  "anand": ["Drama", "Feel Good", "Movies with a Message", "Cult Classic"],
  "sholay": ["Dishoom Dishoom", "Action", "100% Masala", "Blockbuster", "Cult Classic"],
  "deewar": ["Drama", "Crime", "Angry Young Man", "Movies with a Message"],
  "mughal-e-azam": ["Period Piece", "Love/Romance", "Star-Crossed Lovers", "Cult Classic"],
  "mother-india": ["Drama", "Movies with a Message", "Patriotic", "Cult Classic"],
  "guide": ["Drama", "Movies with a Message", "Love/Romance", "Parallel Cinema"],
  "pyaasa": ["Drama", "Movies with a Message", "Parallel Cinema", "Cult Classic"],
  "kaagaz-ke-phool": ["Drama", "Parallel Cinema", "Cult Classic"],
  "do-bigha-zamin": ["Drama", "Movies with a Message", "Parallel Cinema"],
  "namak-haraam": ["Drama", "Angry Young Man", "Movies with a Message"],
  "lamhe": ["Love/Romance", "Drama", "Candy-Floss/NRI Romance"],
  "mera-naam-joker": ["Drama", "Feel Good", "Cult Classic"],
};

// ── Rating-based auto-badges ──────────────────────────────────────────────────
function ratingBadge(rating: number | null): string[] {
  if (!rating) return [];
  if (rating >= 80) return ["Cult Classic"];
  if (rating >= 70) return ["Blockbuster"];
  return [];
}

// ── Main matching logic ───────────────────────────────────────────────────────
function assignBadges(film: {
  title: string;
  slug: string;
  year: number | null;
  rating: number | null;
  plot: string | null;
  oneliner: string | null;
  stars: string | null;
}): string[] {
  const hay = [film.title, film.plot ?? "", film.oneliner ?? ""]
    .join(" ")
    .toLowerCase();
  const titleLow = film.title.toLowerCase();

  const collected = new Set<string>();

  // 1. Hardcoded overrides — strip trailing year suffix (e.g. "chhaava-2025" → "chhaava")
  const baseSlug = film.slug.replace(/-\d{4}$/, "");
  const known = KNOWN_BADGES[film.slug] ?? KNOWN_BADGES[baseSlug];
  if (known) {
    known.forEach((b) => collected.add(b));
    // Don't skip rule matching — add more if appropriate
  }

  // 2. Rule-based pattern matching
  for (const rule of BADGE_RULES) {
    const matchBody = rule.patterns.some((p) => hay.includes(p));
    const matchTitle = rule.titlePatterns?.some((p) => titleLow.includes(p)) ?? false;
    if (matchBody || matchTitle) {
      collected.add(rule.badge);
    }
  }

  // 3. Era heuristics
  if (film.year) {
    for (const era of ERA_RULES) {
      if (film.year >= era.yearFrom && film.year <= era.yearTo) {
        if (!era.minRating || (film.rating && film.rating >= era.minRating)) {
          collected.add(era.badge);
        }
      }
    }
  }

  // 4. Rating-based
  ratingBadge(film.rating).forEach((b) => collected.add(b));

  // 5. Fallback: if we couldn't assign anything, use generic genre labels
  if (collected.size === 0) {
    // Very broad fallback based on year and rating
    if (film.year && film.year <= 1980) {
      collected.add("Drama");
    } else {
      collected.add("Timepass");
    }
  }

  // Deduplicate and limit to 6 most relevant badges
  const result = Array.from(collected).slice(0, 6);
  return result;
}

// ── Run ───────────────────────────────────────────────────────────────────────
type FilmRow = {
  id: number;
  title: string;
  slug: string;
  year: number | null;
  rating: number | null;
  plot: string | null;
  oneliner: string | null;
  stars: string | null;
  status: string | null;
};

const films = db.prepare(`
  SELECT id, title, slug, year, rating, plot, oneliner, stars, status
  FROM films
  WHERE badges IS NULL OR badges = ''
  ORDER BY
    CASE WHEN status IN ('in_theaters','streaming','coming_soon') THEN 0 ELSE 1 END,
    rating DESC NULLS LAST
`).all() as FilmRow[];

console.log(`[assign-badges] ${films.length} films to process...`);

const update = db.prepare(`UPDATE films SET badges = ? WHERE id = ?`);

let count = 0;
const runAll = db.transaction(() => {
  for (const film of films) {
    const badges = assignBadges(film);
    if (badges.length > 0) {
      update.run(badges.join(","), film.id);
      count++;
    }
  }
});

runAll();
console.log(`[assign-badges] Done — updated ${count} films`);

// Summary of badge distribution
const stats = db.prepare(`
  SELECT badges, COUNT(*) as cnt FROM films
  WHERE badges IS NOT NULL AND badges != ''
  GROUP BY badges
  ORDER BY cnt DESC
  LIMIT 1
`).get() as { badges: string; cnt: number } | undefined;
console.log(`[assign-badges] DB now has ${db.prepare("SELECT COUNT(*) as c FROM films WHERE badges IS NOT NULL AND badges != ''").get() as {c:number} | undefined} films with badges`);
void stats;

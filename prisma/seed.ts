/**
 * Dishoom database seed script
 * Uses better-sqlite3 directly — fast, synchronous, no adapter needed
 */
import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

interface FilmData {
  oldId: number | null;
  title: string;
  year: number | null;
  slug: string;
  rating: number | null;
  votes: number;
  summary: string | null;
  plot: string | null;
  storyline: string | null;
  oneliner: string | null;
  posterSrc: string | null;
  trailer: string | null;
  writers: string | null;
  musicDirectors: string | null;
  wikiHandle: string | null;
  badges: string | null;
  status: string;
}

interface ReviewData {
  oldId: number | null;
  filmIdx: number;
  reviewer: string | null;
  sourceName: string | null;
  sourceLink: string | null;
  rating: number | null;
  excerpt: string | null;
  article: string | null;
  imgSrc: string | null;
}

interface SongData {
  oldId: number | null;
  filmIdx: number;
  title: string | null;
  youtubeId: string | null;
}

interface SeedData {
  films: FilmData[];
  people: unknown[];
  reviews: ReviewData[];
  songs: SongData[];
  articles: unknown[];
}

const dataPath = path.join(__dirname, "seed-data.json");
console.log(`Loading seed data from ${dataPath}...`);

const raw = fs.readFileSync(dataPath, "utf-8");
const data: SeedData = JSON.parse(raw);

console.log(
  `Loaded: ${data.films.length} films, ${data.reviews.length} reviews, ${data.songs.length} songs`
);

// --- Clear existing data ---
console.log("Clearing existing data...");
db.exec(`
  DELETE FROM songs;
  DELETE FROM reviews;
  DELETE FROM articles;
  DELETE FROM film_people;
  DELETE FROM films;
  DELETE FROM people;
`);

// --- Insert films ---
console.log("Inserting films...");
const filmIdMap: Record<number, number> = {}; // filmIdx -> DB id

const insertFilm = db.prepare(`
  INSERT INTO films (old_id, title, year, slug, rating, votes, summary, plot,
                     storyline, oneliner, poster_src, trailer, writers,
                     music_directors, wiki_handle, badges, status)
  VALUES (@oldId, @title, @year, @slug, @rating, @votes, @summary, @plot,
          @storyline, @oneliner, @posterSrc, @trailer, @writers,
          @musicDirectors, @wikiHandle, @badges, @status)
`);

const insertFilmsBatch = db.transaction((films: FilmData[], startIdx: number) => {
  for (let j = 0; j < films.length; j++) {
    const f = films[j];
    const info = insertFilm.run(f);
    filmIdMap[startIdx + j] = info.lastInsertRowid as number;
  }
});

const BATCH = 500;
for (let i = 0; i < data.films.length; i += BATCH) {
  insertFilmsBatch(data.films.slice(i, i + BATCH), i);
  process.stdout.write(`  ${Math.min(i + BATCH, data.films.length)}/${data.films.length} films...\r`);
}
console.log(`  ${data.films.length} films inserted.           `);

// --- Insert reviews ---
console.log("Inserting reviews...");
const insertReview = db.prepare(`
  INSERT OR IGNORE INTO reviews (old_id, film_id, reviewer, source_name,
                                  source_link, rating, excerpt, article, img_src)
  VALUES (@oldId, @filmId, @reviewer, @sourceName,
          @sourceLink, @rating, @excerpt, @article, @imgSrc)
`);

let reviewCount = 0;
const insertReviewsBatch = db.transaction((reviews: ReviewData[]) => {
  for (const r of reviews) {
    const filmId = filmIdMap[r.filmIdx];
    if (filmId === undefined) continue;
    insertReview.run({ ...r, filmId });
    reviewCount++;
  }
});

for (let i = 0; i < data.reviews.length; i += BATCH) {
  insertReviewsBatch(data.reviews.slice(i, i + BATCH));
  process.stdout.write(`  ${Math.min(i + BATCH, data.reviews.length)}/${data.reviews.length} reviews...\r`);
}
console.log(`  ${reviewCount} reviews inserted.           `);

// --- Insert songs ---
console.log("Inserting songs...");
const insertSong = db.prepare(`
  INSERT OR IGNORE INTO songs (old_id, film_id, title, youtube_id)
  VALUES (@oldId, @filmId, @title, @youtubeId)
`);

let songCount = 0;
const insertSongsBatch = db.transaction((songs: SongData[]) => {
  for (const s of songs) {
    const filmId = filmIdMap[s.filmIdx];
    if (filmId === undefined) continue;
    insertSong.run({ ...s, filmId });
    songCount++;
  }
});

for (let i = 0; i < data.songs.length; i += BATCH) {
  insertSongsBatch(data.songs.slice(i, i + BATCH));
}
console.log(`  ${songCount} songs inserted.`);

// --- Insert articles ---
console.log("Inserting articles...");
const insertArticle = db.prepare(`
  INSERT OR IGNORE INTO articles (title, slug, description, celebrity, is_spotlight)
  VALUES (@title, @slug, @description, @celebrity, @isSpotlight)
`);

const sampleArticles = [
  { title: "An Ode To Deepika Padukone", slug: "an-ode-to-deepika-padukone", description: "It is the east and Deepika is the sun.", celebrity: null, isSpotlight: 1 },
  { title: "10 Bollywood Stories We're Thankful For in 2013", slug: "10-bollywood-stories-were-thankful-for-in-2013", description: "Looking back at the best Bollywood moments of the year.", celebrity: null, isSpotlight: 1 },
  { title: "The 10 Worst Item Songs of the Last 10 Years", slug: "the-10-worst-item-songs-of-the-last-10-years", description: "A cringe-worthy countdown of Bollywood's lowest moments.", celebrity: null, isSpotlight: 1 },
  { title: "Dishoom Showdown: Ranbir vs. Ranveer", slug: "dishoom-showdown-ranbir-vs-ranveer", description: "Who's the better actor of their generation?", celebrity: null, isSpotlight: 1 },
  { title: "Who Are Ram Gopal Varma's 5 Divine Muses", slug: "who-are-ram-gopal-varmas-5-divine-muses", description: "The maverick director's obsessions, ranked.", celebrity: null, isSpotlight: 1 },
  { title: "Koffee With Karan Countdown: Deepika and Sonam", slug: "koffee-with-karan-countdown-deepika-and-sonam", description: "Watch the best Koffee interview.", celebrity: "Deepika Padukone", isSpotlight: 0 },
  { title: "Shahid: I Finally Feel Like a Man", slug: "shahid-i-finally-feel-like-a-man", description: "You almost look like one, too.", celebrity: null, isSpotlight: 0 },
  { title: "Mallika Sherawat Shuts Down a Reporter", slug: "mallika-sherawat-shuts-down-a-reporter", description: "The bold actress defends her bold statement at Cannes.", celebrity: "Mallika Sherawat", isSpotlight: 0 },
  { title: "Hrithik: Hollywood Stars Are Jealous of Bollywood Stars", slug: "hrithik-hollywood-stars-are-jealous-of-bollywood-stars", description: "BTW, when did Duggu become a hipster?", celebrity: null, isSpotlight: 0 },
  { title: "Ranveer and Arjun Kapoor Are Gangstas in the Gunday Teaser", slug: "ranveer-and-arjun-kapoor-are-gangstas-in-the-gunday-teaser", description: "The chemistry between them is undeniable.", celebrity: null, isSpotlight: 1 },
  { title: "Madhuri Enchants in Dedh Ishqiya's 'Hamari Atariya'", slug: "madhuri-enchants-in-dedh-ishqiyas-hamari-atariya", description: "The quintessential Bharat naari returns as a courtesan.", celebrity: null, isSpotlight: 0 },
  { title: "Koffee With Karan Countdown: SRK", slug: "koffee-with-karan-countdown-srk", description: "Watch the #2 best Koffee interview.", celebrity: "Shahrukh Khan", isSpotlight: 0 },
  { title: "Saif Is Getting Old", slug: "saif-is-getting-old", description: "The nautanki nawab dishes on Bullett Raja, his family, and his aching knees.", celebrity: null, isSpotlight: 0 },
  { title: "Happy 45th Birthday, Juhi!", slug: "happy-45th-birthday-juhi", description: "A tribute to one of Bollywood's most beloved actresses.", celebrity: "Juhi Chawla", isSpotlight: 1 },
];

const insertArticlesBatch = db.transaction(() => {
  for (const a of sampleArticles) insertArticle.run(a);
});
insertArticlesBatch();
console.log(`  ${sampleArticles.length} articles inserted.`);

// --- Mark films with special statuses ---
const updateStatus = db.prepare(`UPDATE films SET status = ? WHERE slug = ?`);

const inTheaters = [
  "ramleela-2013", "singh-saab-the-great-2013", "gori-tere-pyaar-mein-2013",
  "bullett-raja-2013", "krrish-3-2013", "satya-2-2013",
];
const comingSoon = [
  "shaadi-ke-side-effects-2014", "gunday-2013", "highway-2013",
  "queen-2014", "kaanchi-2014",
];

const updateStatusBatch = db.transaction(() => {
  for (const slug of inTheaters) updateStatus.run("in_theaters", slug);
  for (const slug of comingSoon) updateStatus.run("coming_soon", slug);
});
updateStatusBatch();

// --- Final counts ---
const counts = {
  films: (db.prepare("SELECT COUNT(*) as c FROM films").get() as { c: number }).c,
  reviews: (db.prepare("SELECT COUNT(*) as c FROM reviews").get() as { c: number }).c,
  songs: (db.prepare("SELECT COUNT(*) as c FROM songs").get() as { c: number }).c,
  articles: (db.prepare("SELECT COUNT(*) as c FROM articles").get() as { c: number }).c,
};

db.close();
console.log(`\n✓ Seed complete!`);
console.log(`Final counts: ${counts.films} films, ${counts.reviews} reviews, ${counts.songs} songs, ${counts.articles} articles`);

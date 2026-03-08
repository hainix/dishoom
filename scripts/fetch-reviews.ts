import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve(process.cwd(), 'prisma/dev.db'));
db.pragma('journal_mode = WAL');

const TMDB_KEY = process.env.TMDB_API_KEY || 'f8a0148b386a3f00558c847eb9e4284f';
const OMDB_KEY = process.env.OMDB_API_KEY;

if (!OMDB_KEY) {
  console.error('ERROR: OMDB_API_KEY not set in environment. Add it to .env.local and re-run.');
  process.exit(1);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRating(source: string, value: string): number | null {
  if (source === 'Rotten Tomatoes') {
    const pct = parseInt(value.replace('%', ''), 10);
    return isNaN(pct) ? null : pct;
  }
  if (source === 'Metacritic') {
    const score = parseInt(value.split('/')[0], 10);
    return isNaN(score) ? null : score;
  }
  if (source === 'Internet Movie Database') {
    const score = parseFloat(value.split('/')[0]);
    return isNaN(score) ? null : Math.round(score * 10);
  }
  return null;
}

const insertReview = db.prepare(`
  INSERT INTO reviews (film_id, reviewer, source_name, source_link, rating, excerpt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const checkDupBySource = db.prepare(
  `SELECT id FROM reviews WHERE film_id = ? AND source_name = ? LIMIT 1`
);

const checkDupByLink = db.prepare(
  `SELECT id FROM reviews WHERE film_id = ? AND source_link = ? LIMIT 1`
);

// ── Main ──────────────────────────────────────────────────────────────────────

interface TargetFilm {
  id: number;
  title: string;
  tmdb_id: number;
}

const films = db
  .prepare(
    `SELECT id, title, tmdb_id FROM films
     WHERE status IN ('in_theaters','streaming','coming_soon')
       AND tmdb_id IS NOT NULL`
  )
  .all() as TargetFilm[];

async function main() {
console.log(`\nFetching reviews for ${films.length} current films...\n`);

let totalInserted = 0;
let totalSkipped = 0;

for (const film of films) {
  console.log(`── ${film.title} (tmdb_id: ${film.tmdb_id})`);

  // Step 1: Get IMDb ID from TMDB
  let imdbId: string | null = null;
  try {
    const extRes = await fetch(
      `https://api.themoviedb.org/3/movie/${film.tmdb_id}/external_ids?api_key=${TMDB_KEY}`
    );
    if (extRes.ok) {
      const extData = await extRes.json() as { imdb_id?: string };
      imdbId = extData.imdb_id || null;
    }
  } catch (e) {
    console.warn(`  TMDB external_ids failed: ${e}`);
  }

  // Step 2: OMDb aggregate scores
  if (imdbId) {
    try {
      const omdbRes = await fetch(
        `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`
      );
      if (omdbRes.ok) {
        const omdbData = await omdbRes.json() as {
          Response: string;
          Ratings?: Array<{ Source: string; Value: string }>;
        };

        if (omdbData.Response === 'True' && omdbData.Ratings) {
          for (const rating of omdbData.Ratings) {
            const source = rating.Source; // "Rotten Tomatoes" | "Metacritic" | "Internet Movie Database"
            const normalized = normalizeRating(source, rating.Value);
            if (normalized === null) continue;

            // Map to friendlier display name for IMDB
            const displaySource =
              source === 'Internet Movie Database' ? 'IMDB' : source;

            const exists = checkDupBySource.get(film.id, displaySource);
            if (exists) {
              console.log(`  [skip] ${displaySource} already in reviews`);
              totalSkipped++;
              continue;
            }

            insertReview.run(film.id, null, displaySource, null, normalized, null);
            console.log(`  [+] ${displaySource}: ${normalized}/100`);
            totalInserted++;
          }
        } else {
          console.log(`  OMDb: no data (${omdbData.Response})`);
        }
      }
    } catch (e) {
      console.warn(`  OMDb fetch failed: ${e}`);
    }
  } else {
    console.log(`  No IMDb ID — skipping OMDb`);
  }

  // Step 3: TMDB individual reviews
  try {
    const reviewsRes = await fetch(
      `https://api.themoviedb.org/3/movie/${film.tmdb_id}/reviews?api_key=${TMDB_KEY}&language=en-US`
    );
    if (reviewsRes.ok) {
      const reviewsData = await reviewsRes.json() as {
        results?: Array<{
          author: string;
          author_details?: { rating?: number };
          content: string;
          url: string;
        }>;
      };

      const tmdbReviews = reviewsData.results || [];
      const ratedReviews = tmdbReviews.filter(
        (r) => r.author_details?.rating != null
      );

      for (const review of ratedReviews) {
        const exists = checkDupByLink.get(film.id, review.url);
        if (exists) {
          console.log(`  [skip] TMDB review by ${review.author} already exists`);
          totalSkipped++;
          continue;
        }

        const rating = Math.round((review.author_details!.rating! / 10) * 100);
        const excerpt = review.content.slice(0, 400);

        insertReview.run(film.id, review.author, 'TMDB', review.url, rating, excerpt);
        console.log(`  [+] TMDB review by ${review.author}: ${rating}/100`);
        totalInserted++;
      }

      if (ratedReviews.length === 0) {
        console.log(`  No rated TMDB reviews found`);
      }
    }
  } catch (e) {
    console.warn(`  TMDB reviews fetch failed: ${e}`);
  }

  await sleep(300);
}

console.log(`\nDone. Inserted: ${totalInserted} | Skipped (already existed): ${totalSkipped}`);
console.log('\nVerification query:');
console.log('  SELECT f.title, r.source_name, r.rating FROM reviews r JOIN films f ON f.id = r.film_id WHERE f.status IN (\'in_theaters\',\'streaming\',\'coming_soon\') ORDER BY f.title, r.source_name;');

db.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

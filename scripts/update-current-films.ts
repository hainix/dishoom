import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve(process.cwd(), 'prisma/dev.db'));
db.pragma('journal_mode = WAL');

// ── Step 1: Fix stale statuses → 'streaming' + add oneliners for CONTENT_GATE ──

const streamingUpdates: { slug: string; oneliner: string }[] = [
  { slug: 'chhaava-2025', oneliner: "Maratha emperor Sambhaji Maharaj rises against Aurangzeb's Mughal forces in this grand historical epic." },
  { slug: 'stree-2-2024', oneliner: "The witch is back — Chanderi's most fearless heroine returns to face a terrifying new supernatural threat." },
  { slug: 'kill-2024', oneliner: "A commando's mission to rescue his fiancée turns the world's most violent train journey into a blood-soaked action showpiece." },
  { slug: 'fighter-2024', oneliner: "India's Air Force strikes back against cross-border terror in this high-octane fighter jet action spectacle." },
  { slug: 'shaitaan-2024', oneliner: "A family's peaceful vacation turns into a supernatural nightmare when a silver-tongued stranger hypnotises their daughter." },
  { slug: 'dhurandhar-2025', oneliner: "A master spy undertakes India's most dangerous covert mission, operating deep inside enemy territory." },
  { slug: 'saiyaara-2025', oneliner: "A passionate love story between a struggling musician and a rising actress — Bollywood's biggest romantic blockbuster ever." },
  { slug: 'jewel-thief-the-heist-begins-2025', oneliner: "India's most stylish thief targets the ultimate prize in this glossy Netflix heist thriller starring Saif Ali Khan." },
  { slug: 'dhoom-dhaam-2025', oneliner: "Two strangers handcuffed together must survive a wild night of crime, comedy, and chemistry on the run." },
  { slug: 'lost-ladies-2024', oneliner: "Two families, one missing woman, a moral reckoning — Bollywood's sharpest social thriller of the decade." },
  { slug: 'sector-36-2024', oneliner: "A no-nonsense detective hunts a brutal serial killer preying on Delhi's invisible street children." },
];

const updateStmt = db.prepare("UPDATE films SET status = 'streaming', oneliner = COALESCE(oneliner, ?) WHERE slug = ?");
const updateMany = db.transaction(() => {
  for (const { slug, oneliner } of streamingUpdates) {
    const result = updateStmt.run(oneliner, slug);
    console.log(`  ${slug}: ${result.changes} row(s)`);
  }
});
console.log('Step 1: Updating stale statuses → streaming...');
updateMany();

// ── Step 2: INSERT new films ────────────────────────────────────────────────────

interface NewFilm {
  title: string; year: number; slug: string; status: string;
  oneliner: string; plot: string; badges: string | null;
  posterSrc: string | null; backdropSrc: string | null;
  rating: number | null; votes: number; tmdbId: number | null;
  stars: string | null;
}

const newFilms: NewFilm[] = [
  // ── In Theaters ──
  {
    title: 'Love & War',
    year: 2026,
    slug: 'love-and-war-2026',
    status: 'in_theaters',
    oneliner: 'Sanjay Leela Bhansali crafts an epic of passion and sacrifice with Ranbir Kapoor, Alia Bhatt, and Vicky Kaushal.',
    plot: 'Sanjay Leela Bhansali returns with his grandest vision yet — a sweeping saga of love, loyalty and war. Ranbir Kapoor and Vicky Kaushal are rivals bound by fate; Alia Bhatt stands at the heart of their world.',
    badges: 'Love/Romance',
    posterSrc: null,
    backdropSrc: null,
    rating: null,
    votes: 0,
    tmdbId: null,
    stars: 'Ranbir Kapoor,Alia Bhatt,Vicky Kaushal',
  },
  {
    title: 'Dhurandhar: The Revenge',
    year: 2026,
    slug: 'dhurandhar-the-revenge-2026',
    status: 'in_theaters',
    oneliner: 'Jaskirat Singh Rangi becomes the deadly operative Hamza Ali Mazari and infiltrates Pakistan in this pulse-pounding spy sequel.',
    plot: 'The origin story of Hamza Ali Mazari — India\'s most dangerous operative. Tracing the chain of events that pushed a young soldier to cross every line, this spy thriller picks up the threads left by the original Dhurandhar and raises the stakes.',
    badges: 'Dishoom Dishoom',
    posterSrc: 'https://image.tmdb.org/t/p/w500/yfikYFZwy3IAq3qvCW77SNZoYI7.jpg',
    backdropSrc: 'https://image.tmdb.org/t/p/w1280/owQeDouUZ6wI6f1aTOYEFd511zn.jpg',
    rating: null,
    votes: 0,
    tmdbId: 1582770,
    stars: 'Ranveer Singh',
  },
  // ── Now Streaming ──
  {
    title: 'Jolly LLB 3',
    year: 2025,
    slug: 'jolly-llb-3-2025',
    status: 'streaming',
    oneliner: 'The loveable underdog lawyer Jagdish Tyagi takes on his biggest courtroom battle in the franchise\'s most explosive chapter.',
    plot: 'Jagdish Tyagi and Jagdishwar Mishra face off in the biggest legal battle of their lives, fighting for a penurious widow in a case that shakes the entire system. The Jolly LLB franchise goes full spectacle.',
    badges: 'No Brain Required Comedy',
    posterSrc: 'https://image.tmdb.org/t/p/w500/bwRoU9p5GvjxgPfmIgsfcJ4ydng.jpg',
    backdropSrc: 'https://image.tmdb.org/t/p/w1280/gC1kJpDPtaogbq7N543si20jC0w.jpg',
    rating: 65,
    votes: 1200,
    tmdbId: 1015981,
    stars: 'Akshay Kumar,Arshad Warsi',
  },
  {
    title: 'Raid 2',
    year: 2025,
    slug: 'raid-2-2025',
    status: 'streaming',
    oneliner: 'IRS officer Amay Patnaik returns to expose a corrupt politician hiding in plain sight as a beloved public benefactor.',
    plot: 'Seven years after his legendary raid, IRS officer Amay Patnaik sets his sights on a seemingly benevolent politician whose charitable empire conceals a vast criminal network. The gloves are off.',
    badges: 'Dishoom Dishoom',
    posterSrc: 'https://image.tmdb.org/t/p/w500/562SAxZP1sLuYqDDTuODu3hdGyx.jpg',
    backdropSrc: 'https://image.tmdb.org/t/p/w1280/uKhBujLqYCcfU1kaxXHNCEyZnT.jpg',
    rating: 63,
    votes: 800,
    tmdbId: 1227128,
    stars: 'Ajay Devgn',
  },
  {
    title: 'Thamma',
    year: 2025,
    slug: 'thamma-2025',
    status: 'streaming',
    oneliner: 'Two destined lovers battle supernatural forces and ancient prophecies to protect their forbidden romance in a mystical world.',
    plot: 'In a world where ancient powers and prophecies dictate fate, two destined lovers must fight against supernatural forces, family ties, and nature itself to defend their forbidden love. Part of Maddock Films\' horror universe.',
    badges: 'Love/Romance',
    posterSrc: 'https://image.tmdb.org/t/p/w500/udkbDwBbysCGEydt0FHnl9dVO2k.jpg',
    backdropSrc: 'https://image.tmdb.org/t/p/w1280/e5bFtChejaGio218NejT0jXgSux.jpg',
    rating: 70,
    votes: 900,
    tmdbId: 1196364,
    stars: 'Alia Bhatt,Ranbir Kapoor',
  },
  {
    title: 'Sunny Sanskari Ki Tulsi Kumari',
    year: 2025,
    slug: 'sunny-sanskari-ki-tulsi-kumari-2025',
    status: 'streaming',
    oneliner: 'Two Delhi exes try to reignite old flames, sparking a hilarious chain of mix-ups and one unexpected new romance.',
    plot: 'Sunny and Tulsi, former lovers in Delhi, find themselves thrown together again and attempt to rekindle what was lost — only to discover that love, like comedy, never goes as planned.',
    badges: 'Candy-Floss/NRI Romance',
    posterSrc: 'https://image.tmdb.org/t/p/w500/h3lncTnK86R8XylpXgpe0JfU1wm.jpg',
    backdropSrc: 'https://image.tmdb.org/t/p/w1280/jas9AaeGWZjT1qcbvuPjccnS56e.jpg',
    rating: 62,
    votes: 700,
    tmdbId: 1248454,
    stars: 'Varun Dhawan,Janhvi Kapoor',
  },
  // ── Coming Soon ──
  {
    title: 'Bhooth Bangla',
    year: 2026,
    slug: 'bhooth-bangla-2026',
    status: 'coming_soon',
    oneliner: 'Akshay Kumar leads a madcap comedy-horror caper in a haunted mansion with no shortage of screams and laughs.',
    plot: 'Priyadarshan reunites with Akshay Kumar for a classic comedy-horror romp set in a sprawling haunted mansion. Expect slapstick, supernatural chaos, and the biggest laughs of the year.',
    badges: 'No Brain Required Comedy',
    posterSrc: 'https://image.tmdb.org/t/p/w500/ArIS4vwUxdhm3j7tsTHmffdfU8W.jpg',
    backdropSrc: 'https://image.tmdb.org/t/p/w1280/A2tzVTVtnTvpji96IZmleN78KKv.jpg',
    rating: null,
    votes: 0,
    tmdbId: 1239134,
    stars: 'Akshay Kumar',
  },
  {
    title: 'King',
    year: 2026,
    slug: 'king-2026',
    status: 'coming_soon',
    oneliner: 'A legendary mentor and his student face impossible odds in Shah Rukh Khan\'s most ambitious action epic.',
    plot: 'Shah Rukh Khan plays a legendary figure who takes a young protégé under his wing on a mission that tests their survival skills against the world\'s most ruthless enemies. Christmas 2026\'s biggest release.',
    badges: 'Blockbuster',
    posterSrc: 'https://image.tmdb.org/t/p/w500/74fHULlTBMGGLusfFBVAkMAZbce.jpg',
    backdropSrc: 'https://image.tmdb.org/t/p/w1280/tInyP783MTHruydmJMSo7mfag1U.jpg',
    rating: null,
    votes: 0,
    tmdbId: 1145110,
    stars: 'Shah Rukh Khan,Suhana Khan',
  },
  {
    title: 'Ramayana',
    year: 2026,
    slug: 'ramayana-2026',
    status: 'coming_soon',
    oneliner: 'Nitesh Tiwari\'s epic retelling brings Ranbir Kapoor as Ram and Sai Pallavi as Sita to the big screen in India\'s most ambitious film.',
    plot: 'Director Nitesh Tiwari (Dangal) helms the most ambitious Bollywood production in history — a grand retelling of the Ramayana with Ranbir Kapoor as Ram, Sai Pallavi as Sita, and Yash as Ravana.',
    badges: 'Blockbuster',
    posterSrc: 'https://image.tmdb.org/t/p/w500/f3yZZw7zIsWo6m9xJStfjDauIZX.jpg',
    backdropSrc: 'https://image.tmdb.org/t/p/w1280/prbMZ3DPf8taS6JYQd6igPnm2mA.jpg',
    rating: null,
    votes: 0,
    tmdbId: 656908,
    stars: 'Ranbir Kapoor,Sai Pallavi,Yash',
  },
  {
    title: 'Border 2',
    year: 2026,
    slug: 'border-2-2026',
    status: 'coming_soon',
    oneliner: 'The iconic 1971 war epic gets its long-awaited sequel as India\'s soldiers face a new defining battle.',
    plot: 'Sequel to the 1997 classic Border. A new generation of soldiers faces the horrors and heroism of modern warfare as India enters its most critical military confrontation.',
    badges: 'Dishoom Dishoom',
    posterSrc: 'https://image.tmdb.org/t/p/w500/AmrCgmDPEJ6QxllS1rhjYwgO9Wb.jpg',
    backdropSrc: 'https://image.tmdb.org/t/p/w1280/fzo85eKFEjfmJ781gubJQjpQAwF.jpg',
    rating: null,
    votes: 0,
    tmdbId: 1213898,
    stars: 'Varun Dhawan,Diljit Dosanjh',
  },
];

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO films (
    title, year, slug, status, oneliner, plot, badges,
    poster_src, backdrop_src, rating, votes, tmdb_id, stars
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

console.log('\nStep 2: Inserting new films...');
const insertMany = db.transaction(() => {
  for (const f of newFilms) {
    const result = insertStmt.run(
      f.title, f.year, f.slug, f.status, f.oneliner, f.plot, f.badges,
      f.posterSrc, f.backdropSrc, f.rating, f.votes, f.tmdbId, f.stars
    );
    console.log(`  INSERT ${f.slug}: ${result.changes} row(s)`);
  }
});
insertMany();

// Verify
console.log('\nVerification — films by status:');
const statusCounts = db.prepare("SELECT status, COUNT(*) as cnt FROM films WHERE status IS NOT NULL GROUP BY status ORDER BY cnt DESC").all();
console.log(JSON.stringify(statusCounts, null, 2));

console.log('\nStreaming films sample:');
const streamingSample = db.prepare("SELECT title, year, oneliner FROM films WHERE status = 'streaming' ORDER BY year DESC LIMIT 6").all();
console.log(JSON.stringify(streamingSample, null, 2));

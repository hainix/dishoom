/**
 * tag-songs.ts
 *
 * Assigns rich, Bollywood-fan-meaningful multi-tags to every song with a YouTube ID.
 * Tags are stored comma-separated in the `category` column so the watch page
 * can filter by any single tag (using LIKE matching).
 *
 * Tag dimensions used:
 *   Style:    qawwali, ghazal, mujra, bhajan, folk, classical, sufi, item-number,
 *             instrumental, fusion
 *   Mood:     romantic, heartbreak, tear-jerker, philosophical, defiant, bittersweet,
 *             melancholy, euphoric, soulful, playful
 *   Energy:   anthem, earworm, dance-floor, campfire, slow-burn, singalong
 *   Theme:    friendship, monsoon, rain-romance, holi, wedding, patriotic, devotional,
 *             village-life, coming-of-age, road-trip, college, maternal-love,
 *             mughal-era, british-india, radha-krishna
 *   Context:  ar-rahman, raj-kapoor, shankar-ehsaan-loy, oscar-winning, golden-age,
 *             retro-70s, bollywood-crossover, iconic, evergreen, black-and-white,
 *             bombshell, courtly, lata-mangeshkar
 *
 * Usage: npx tsx scripts/tag-songs.ts
 */

import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.resolve(process.cwd(), "prisma/dev.db"));

// ── Tag map: song ID → tags ──────────────────────────────────────────────────
// Every song gets multiple tags. Songs that are duplicates/remixes of the same
// track share the same core tags.

const SONG_TAGS: Record<number, string[]> = {

  // ── AWAARA (1951, Raj Kapoor) ──────────────────────────────────────────────
  // Shankar-Jaikishan | Lata Mangeshkar, Mukesh, Manna Dey

  8605: ["golden-age", "playful", "folk", "earworm", "raj-kapoor"],
  // Ek Do Teen — lighthearted children's counting song

  8606: ["golden-age", "bittersweet", "philosophical", "soulful"],
  8615: ["golden-age", "bittersweet", "philosophical", "soulful"],
  // Hanste Bhi Rahe / Hum Tujhse Mohabbat — mixed laughter and tears

  8607: ["anthem", "iconic", "evergreen", "golden-age", "philosophical",
         "raj-kapoor", "vagabond", "soulful", "bittersweet", "singalong"],
  8618: ["anthem", "iconic", "evergreen", "golden-age", "philosophical",
         "raj-kapoor", "vagabond", "soulful", "bittersweet", "singalong"],
  // Awara Hoon — the definitive vagabond anthem, sang from Moscow to Tokyo

  8608: ["heartbreak", "melancholy", "sad", "golden-age", "betrayal"],
  // Ek Bewafa Se Pyar Kiya — aching heartbreak

  8609: ["melancholy", "late-night", "atmospheric", "golden-age", "romantic"],
  8620: ["melancholy", "late-night", "atmospheric", "golden-age", "romantic"],
  // Ab Raat Guzarne Wali Hai — midnight longing

  8610: ["folk", "village-life", "rustic", "golden-age", "romantic"],
  // Jab Se Balam Ghar Aaye — village folk romance

  8611: ["reunion", "heartbreak", "emotional", "golden-age", "soulful",
         "longing", "tear-jerker", "lata-mangeshkar"],
  8619: ["reunion", "heartbreak", "emotional", "golden-age", "soulful",
         "longing", "tear-jerker", "lata-mangeshkar"],
  // Ghar Aaya Mera Pardesi — the wanderer comes home, Lata at her peak

  8616: ["reunion", "heartbreak", "emotional", "golden-age", "soulful", "longing"],
  // Jhankar remix of the same

  8612: ["romantic", "flirtatious", "golden-age", "playful"],
  // Dam Bhar Jo Udhar Munh Phere — charming flirtation

  8613: ["romantic", "melancholy", "golden-age", "moonlit"],
  // Tere Bina Aag Yeh Chandni — moonlit longing

  8614: ["philosophical", "journey", "metaphor", "golden-age", "soulful"],
  // Naiya Meri Manjhdhar — boat as life metaphor

  8617: ["instrumental", "golden-age", "raj-kapoor", "iconic"],
  // Title Music — cinematic overture

  // ── SHREE 420 (1955, Raj Kapoor) ──────────────────────────────────────────
  // Shankar-Jaikishan | Mukesh, Lata Mangeshkar, Manna Dey

  9272: ["anthem", "iconic", "evergreen", "golden-age", "raj-kapoor", "vagabond",
         "patriotic", "playful", "earworm", "singalong", "black-and-white"],
  9276: ["anthem", "iconic", "evergreen", "golden-age", "raj-kapoor", "vagabond",
         "patriotic", "playful", "earworm", "singalong", "black-and-white"],
  // Mera Joota Hai Japani — THE vagabond anthem, banned in Pakistan, loved worldwide

  9273: ["rain-romance", "monsoon", "iconic", "romantic", "golden-age",
         "raj-kapoor", "umbrella-scene", "evergreen", "lata-mangeshkar",
         "earworm", "bittersweet", "black-and-white"],
  9279: ["rain-romance", "monsoon", "iconic", "romantic", "golden-age",
         "raj-kapoor", "umbrella-scene", "evergreen", "lata-mangeshkar",
         "earworm", "bittersweet", "black-and-white"],
  // Pyar Hua Ikraar Hua — the umbrella rain scene, one of Bollywood's most romantic moments

  9274: ["playful", "call-and-response", "romantic", "golden-age", "earworm"],
  9280: ["playful", "call-and-response", "romantic", "golden-age", "earworm"],
  // Ramaiya Vastavaiya — catchy street romance, remade countless times

  9275: ["playful", "children-delight", "riddle-song", "golden-age", "sweet", "earworm"],
  // Ichak Dana Beechak Dana — beloved riddle-nursery hybrid

  9277: ["flirtatious", "playful", "golden-age", "raj-kapoor", "street-charm"],
  // Mud Mud Ke Na Dekh — street flirtation with swagger

  9278: ["wanderer", "longing", "golden-age", "soulful"],
  // O Janewale Mud Ke Zara — the call of the road

  9281: ["evening", "atmospheric", "melancholy", "late-night", "golden-age", "soulful"],
  // Sham Gai Raat Aai — dusk to night, quietly devastating

  9282: ["philosophical", "social-commentary", "raj-kapoor", "golden-age",
         "street-poet", "folk", "bittersweet"],
  // Dil Ka Haal Sune Dilwala — Raj Kapoor's working-class philosophy

  // ── MOTHER INDIA (1957, Nargis) ────────────────────────────────────────────
  // Naushad | Lata Mangeshkar, Shamshad Begum, Manna Dey

  8390: ["folk", "village-life", "celebration", "golden-age", "seasonal"],
  // Chundariya Katati Jaye — village harvest celebration

  8391: ["folk", "bhajan", "village-life", "devotional", "wandering", "golden-age"],
  8402: ["folk", "bhajan", "village-life", "devotional", "wandering", "golden-age"],
  // Nagari Nagari Dware Dware — door-to-door devotional wandering

  8392: ["folk", "village-life", "rustic", "golden-age"],
  // O Gaadiwale — the bullock cart song, pure village life

  8393: ["romantic", "folk", "village-life", "longing", "golden-age"],
  // Matwala Jiya Dole Piya — rural romance with Nargis

  8394: ["sad", "folk", "village-life", "rural-struggle", "tear-jerker",
         "lament", "golden-age", "heartbreak"],
  // Dukh Bhare Din Beete Re Bhaiya — the crushing weight of poverty and hope

  8395: ["holi", "festival", "village-life", "folk", "celebration",
         "radha-krishna", "golden-age", "earworm"],
  // Holi Aayi Re Kanhai — the definitive Holi song, colours and joy

  8396: ["wedding", "village-life", "bittersweet", "emotional", "folk", "golden-age"],
  // Pi Ke Ghar Aaj Pyari Dulhaniya — a bride leaving her village

  8397: ["defiant", "folk", "village-life", "feisty", "golden-age"],
  // Ghunghat Nahin Kholoongi — Nargis refuses the veil, bold for its era

  8398: ["maternal-love", "tear-jerker", "emotional", "devotional", "iconic",
         "golden-age", "gut-wrenching", "bhajan"],
  // O Mere Lal Aaja — a mother's cry for her lost son, cinema's rawest grief

  8399: ["farewell", "emotional", "folk", "longing", "golden-age"],
  // O Janewalo Jao Na — begging the beloved not to leave

  8400: ["philosophical", "devotional", "classical", "introspective", "golden-age"],
  // Na Main Bhagwan Hoon — questioning divinity

  8401: ["philosophical", "village-life", "golden-age", "folk"],
  // Duniya Men Hum Aaye Hain — circle of life

  // ── GATEWAY OF INDIA (1957) ────────────────────────────────────────────────
  // C. Ramchandra | Lata Mangeshkar, Geeta Dutt

  14546: ["romantic", "melancholy", "old-mumbai", "golden-age", "longing", "soulful"],
  14549: ["romantic", "melancholy", "old-mumbai", "golden-age", "longing", "soulful"],
  // Do Ghadi Woh Jo Paas Baithe — fleeting closeness, old Bombay backdrop

  14547: ["heartbreak", "longing", "golden-age", "melancholy", "soulful"],
  // Yeh Raah Badi Mushkil Hai — the road is hard, life harder

  14548: ["dreamy", "romantic", "golden-age", "longing", "soulful"],
  // Sapne Men Sajan Se Do Baaten — love in dreams when life won't allow

  14550: ["playful", "sweet", "golden-age", "light-hearted", "flirtatious"],
  // Na Hanso Hampe — teasing romance

  // ── MUGHAL-E-AZAM (1960) ──────────────────────────────────────────────────
  // Naushad | Lata Mangeshkar, Bade Ghulam Ali Khan, Shamshad Begum

  2101: ["sufi", "qawwali", "devotional", "mughal-era", "classical",
         "lata-mangeshkar", "golden-age", "soulful"],
  7393: ["sufi", "qawwali", "devotional", "mughal-era", "classical", "golden-age"],
  // Bekas Pe Karam — Sufi surrender, Lata with Naushad's masterful composition

  2102: ["mujra", "courtly", "radha-krishna", "folk-classical", "devotional",
         "mughal-era", "dance", "golden-age", "classical-dance"],
  7394: ["mujra", "courtly", "radha-krishna", "folk-classical", "devotional",
         "mughal-era", "dance", "golden-age", "classical-dance"],
  // Mohe Panghat Pe Nandlal — a mujra woven from Radha-Krishna devotion

  2103: ["iconic", "defiant", "mujra", "mughal-era", "golden-age", "tear-jerker",
         "courtly", "evergreen", "lata-mangeshkar", "black-and-white",
         "bombshell", "classical-dance", "anthem"],
  7389: ["iconic", "defiant", "mujra", "mughal-era", "golden-age", "tear-jerker",
         "courtly", "evergreen", "lata-mangeshkar", "black-and-white",
         "bombshell", "classical-dance", "anthem"],
  // Pyaar Kiya To Darna Kya — Madhubala defying Akbar in his own court,
  //   one of the most electrifying moments in all of Indian cinema

  2104: ["ghazal", "mujra", "courtly", "tragic-love", "melancholy", "mughal-era",
         "golden-age", "lata-mangeshkar", "poetic", "black-and-white", "tear-jerker"],
  7395: ["ghazal", "mujra", "courtly", "tragic-love", "melancholy", "mughal-era",
         "golden-age", "lata-mangeshkar", "poetic", "black-and-white", "tear-jerker"],
  // Tere Mehfil Mein — losing at love in the royal court

  2105: ["ghazal", "yearning", "golden-age", "melancholy", "soulful"],
  7391: ["ghazal", "yearning", "golden-age", "melancholy", "soulful"],
  // Ye Dil Ki Lagi — longing that never ends

  2106: ["celebratory", "mughal-court", "golden-age"],
  7397: ["celebratory", "patriotic", "mughal-court", "golden-age", "anthem"],
  // Zindabad / Ae Mohabbat Zindabad — long live love and the empire

  2107: ["philosophical", "classical", "golden-age", "soulful", "romantic"],
  16088: ["philosophical", "classical", "golden-age", "soulful", "romantic"],
  // Ye Zindgi Usi Ki Hai — life belongs to those who live for love

  7390: ["heartbreak", "sad", "golden-age", "philosophical", "soulful"],
  // Mohabbat Ki Jhooti Kahani — love's false promises

  7392: ["farewell", "blessings", "classical", "golden-age"],
  // Khuda Nigehban Ho — a prayer-farewell

  7396: ["devotional", "spiritual", "classical", "radha-krishna", "golden-age"],
  // Prem Jogan Ban Ke — dressed as a devotee of love

  7398: ["romantic", "ghazal", "philosophical", "golden-age", "soulful"],
  // Ae Ishq Yeh Sab Duniyawale — the world against love

  7399: ["longing", "sad", "golden-age", "ghazal", "soulful"],
  // Humen Kash Tumse Mohabbat — if only I hadn't loved you

  7400: ["celebratory", "classical", "mughal-court", "golden-age"],
  // Shubh Din Aayo Raj Dulara — auspicious court celebration

  // ── RAZIA SULTANA (1961) ───────────────────────────────────────────────────
  // O.P. Nayyar

  15463: ["ghazal", "late-night", "classical", "atmospheric", "melancholy",
          "golden-age", "soulful"],
  // Dhalti Jaaye Raat — the night slowly dissolves, seductive and melancholy

  15464: ["playful", "romantic", "golden-age", "light-hearted", "flirtatious"],
  // Jao Ji Jao — feigned indifference, classic coy romance

  // ── LAGAAN (2001, AR Rahman) ───────────────────────────────────────────────

  14139: ["monsoon", "rain-dance", "folk", "village-life", "ar-rahman",
          "celebration", "earworm", "festival", "british-india"],
  // Ghanan Ghanan — clouds gather, the village dances for rain; AR Rahman folk magic

  14140: ["devotional", "lullaby", "village-life", "ar-rahman", "bhajan",
          "soulful", "women", "maternal-love"],
  // O Paalanharee — village women's lullaby to the divine

  14141: ["romantic", "folk", "village-life", "playful", "ar-rahman",
          "rustic-charm", "earworm", "british-india"],
  // O Re Chhori — cheeky village flirtation under the British Raj

  14142: ["devotional", "radha-krishna", "folk", "ar-rahman", "playful", "bhajan"],
  // Radha Kaise Na Jale — why wouldn't Radha burn seeing Krishna with Gopis

  14143: ["folk", "village-life", "heartfelt", "ar-rahman", "longing",
          "soulful", "romantic", "british-india"],
  14144: ["instrumental", "ar-rahman", "epic", "stirring", "british-india"],
  14145: ["instrumental", "ar-rahman", "epic"],
  14146: ["patriotic", "rousing", "cricket", "british-india", "ar-rahman",
          "village-life", "anthem", "stirring"],
  16078: ["folk", "village-life", "heartfelt", "ar-rahman", "longing",
          "soulful", "romantic"],
  16084: ["patriotic", "folk", "ar-rahman", "village-life", "stirring"],
  16090: ["folk", "village-life", "heartfelt", "ar-rahman", "longing",
          "soulful", "romantic"],
  // Chale Chalo — villagers march to the cricket match against the British Empire

  // ── DIL CHAHTA HAI (2001) ──────────────────────────────────────────────────
  // Shankar-Ehsaan-Loy — the soundtrack that defined an Indian generation

  828: ["friendship-anthem", "youth", "road-trip", "coming-of-age", "evergreen",
        "shankar-ehsaan-loy", "breezy", "earworm", "iconic", "goa-vibes", "singalong"],
  // Dil Chahta Hai — three friends, open road, Goa; the friendship anthem that
  //   reset modern Bollywood's mood dial from tragedy to joy

  829: ["friendship", "introspective", "melancholy", "piano", "bittersweet",
        "shankar-ehsaan-loy", "soulful"],
  6090: ["friendship", "bittersweet", "melancholy", "shankar-ehsaan-loy",
         "introspective", "ending-theme", "soulful"],
  // Jaane Kyoon — the melancholy that follows a perfect weekend

  830: ["romantic", "playful", "chase", "earworm", "shankar-ehsaan-loy",
        "upbeat", "coming-of-age"],
  // Woh Ladki Hai Kahan — the rom-com chase, irresistibly catchy

  // ── SLUMDOG MILLIONAIRE (2008) ─────────────────────────────────────────────
  // AR Rahman — Oscar-winning score

  2921: ["party", "ar-rahman", "vibrant", "night-out", "festive", "dance-floor",
         "oscar-winning"],
  // Aaj Ki Raat Hona Hai Kya — Mumbai nights, pure energy

  2922: ["inspirational", "ar-rahman", "english-lyrics", "soulful",
         "hopeful", "oscar-winning"],
  // Dreams On Fire — A.R. Rahman's meditation on a child's impossible dreams

  2923: ["anthem", "celebratory", "ar-rahman", "oscar-winning", "climax-song",
         "dance-floor", "euphoric", "bollywood-crossover", "iconic", "earworm", "singalong"],
  // Jai Ho — when the credits roll and the whole world dances

  2924: ["hip-hop", "crossover", "gritty", "urban", "bollywood-crossover"],
  2925: ["hip-hop", "crossover", "gritty", "urban", "bollywood-crossover"],
  // Paper Planes — M.I.A.'s urban grit meets Mumbai slums

  2926: ["playful", "ar-rahman", "mumbai-streets", "festive", "light-hearted",
         "earworm"],
  // Ring Ring Ringa — street kids dancing on chawl rooftops

  // ── 3 IDIOTS (2009) ───────────────────────────────────────────────────────
  // Shantanu Moitra | Sonu Nigam, Shreya Ghoshal, Swanand Kirkire

  15: ["college-anthem", "motivational", "feel-good", "earworm", "crowd-pleaser",
       "shankar-ehsaan-loy", "singalong", "philosophy-lite"],
  5265: ["college-anthem", "motivational", "feel-good", "earworm", "crowd-pleaser",
         "shankar-ehsaan-loy"],
  16093: ["college-anthem", "motivational", "feel-good", "earworm", "crowd-pleaser",
          "shankar-ehsaan-loy", "singalong"],
  // Aal Izz Well — "All is well" chanted in times of crisis,
  //   the anti-stress mantra of an entire generation of students

  16: ["nostalgia", "campfire", "acoustic", "friendship", "bittersweet",
       "tear-jerker", "soulful", "melancholy"],
  5263: ["nostalgia", "campfire", "acoustic", "friendship", "bittersweet",
         "tear-jerker", "soulful", "melancholy"],
  8360: ["nostalgia", "campfire", "acoustic", "friendship", "bittersweet",
         "tear-jerker", "soulful", "melancholy"],
  // Behti Hawa Sa Tha Woh — the gentle wind of youth; play this and feel 22 again

  17: ["graduation-anthem", "melancholy", "english-lyrics", "emotional",
       "friendship", "tear-jerker", "campfire"],
  // Give Me Some Sunshine — Aamir Khan and friends, faces upturned, asking for joy

  18: ["friendship", "emotional", "bromance", "climax", "soulful", "tear-jerker"],
  // Jaane Nahin Denge Tujhe — the friends won't let each other go; every farewell scene ever

  19: ["romance", "dreamy", "retro-fantasy", "playful", "shankar-ehsaan-loy",
       "earworm", "quirky"],
  5262: ["romance", "dreamy", "retro-fantasy", "playful", "shankar-ehsaan-loy",
         "earworm", "quirky"],
  5264: ["romance", "dreamy", "retro-fantasy", "playful", "shankar-ehsaan-loy", "earworm"],
  // Zoobi Doobi — Aamir Khan in a 50s dream sequence; impossibly charming

  16101: ["heartbreak", "sad", "lovelorn", "melancholy"],
  // Abhi Kuch Dino Se — quiet devastation of a slow heartbreak

  // ── GOLMAAL 3 (2010) ──────────────────────────────────────────────────────
  // Ajit-Atul

  3552: ["comedy", "ensemble", "earworm", "dance-floor", "crowd-pleaser",
         "slapstick", "rohit-shetty", "masala"],
  6393: ["comedy", "ensemble", "earworm", "dance-floor", "crowd-pleaser", "masala"],
  // Golmaal — chaos, comedy, Ajay Devgn's crew; impossible not to grin

  // ── JHOOTHA HI SAHI (2010) ────────────────────────────────────────────────
  // AR Rahman

  6680: ["qawwali", "devotional", "radha-krishna", "folk-fusion", "ar-rahman",
         "maternal-love", "festive", "earworm"],
  6685: ["qawwali", "devotional", "radha-krishna", "folk-fusion", "ar-rahman",
         "maternal-love", "festive", "earworm"],
  // Maiya Yashoda — AR Rahman's qawwali-folk fusion; a mother's love for Krishna

  // ── ONCE UPON A TIME IN MUMBAI (2010) ─────────────────────────────────────
  // Pritam | Mohit Chauhan

  8142: ["retro-70s", "romantic", "soulful", "slow-burn", "nostalgic",
         "mood-setter", "mohit-chauhan", "melancholy"],
  8149: ["retro-70s", "romantic", "soulful", "slow-burn", "nostalgic",
         "mood-setter", "mohit-chauhan"],
  // Pee Loon — velvet 70s aesthetic, Emraan Hashmi brooding over love

  // ── TEES MAAR KHAN (2010) ─────────────────────────────────────────────────
  // Vishal-Shekhar | Sunidhi Chauhan

  16053: ["item-number", "bombshell", "dance-floor", "seductive", "katrina-kaif",
          "chartbuster", "earworm", "club-hit", "masala", "singalong"],
  // Sheila Ki Jawaani — Katrina Kaif introduced herself to the nation;
  //   the item number that launched a thousand memes and a dozen remixes

};

// ── Apply tags ────────────────────────────────────────────────────────────────

const update = db.prepare(`UPDATE songs SET category = ? WHERE id = ?`);

let updated = 0;
let skipped = 0;

const applyTags = db.transaction(() => {
  for (const [idStr, tags] of Object.entries(SONG_TAGS)) {
    const id = parseInt(idStr, 10);
    const tagString = [...new Set(tags)].join(","); // dedupe just in case
    const result = update.run(tagString, id);
    if (result.changes > 0) updated++;
    else skipped++;
  }
});

applyTags();

console.log(`\n✓ Tagged ${updated} songs`);
if (skipped > 0) console.log(`  (${skipped} IDs not found in DB)`);

// ── Stats ─────────────────────────────────────────────────────────────────────

const rows = db.prepare(`
  SELECT category FROM songs
  WHERE youtube_id IS NOT NULL AND youtube_id != ''
    AND category IS NOT NULL AND category != ''
`).all() as { category: string }[];

const tagCounts: Record<string, number> = {};
for (const row of rows) {
  for (const tag of row.category.split(",").map(t => t.trim()).filter(Boolean)) {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
}

const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
console.log(`\nTag distribution (${sorted.length} unique tags):`);
sorted.forEach(([tag, count]) => console.log(`  ${tag.padEnd(28)} ${count}`));
console.log("\nDone.\n");

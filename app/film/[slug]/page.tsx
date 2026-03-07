import { notFound } from "next/navigation";
import { getFilmBySlug, getReviewsForFilm, getSongsForFilm, getCastForFilm, getSimilarFilms } from "@/lib/db";
import BadgeChip from "@/components/BadgeChip";
import ConsensusBar from "@/components/ConsensusBar";
import VideoPlayer from "@/components/VideoPlayer";
import FilmDetailTabs from "@/components/FilmDetailTabs";
import DishooomMeter from "@/components/DishooomMeter";
import Link from "next/link";

interface FilmPageProps {
  params: Promise<{ slug: string }>;
}

function scoreColor(rating: number | null): string {
  if (!rating) return "#9ca3af";
  if (rating >= 60) return "#22c55e";
  if (rating >= 50) return "#D4AF37";
  return "#ef4444";
}

function scoreLabel(rating: number | null): string {
  if (!rating) return "NR";
  if (rating >= 60) return "Fresh";
  if (rating >= 50) return "Mixed";
  return "Rotten";
}

export default async function FilmPage({ params }: FilmPageProps) {
  const { slug } = await params;
  const film = getFilmBySlug(slug);
  if (!film) notFound();

  const reviews = getReviewsForFilm(film.id, 20);
  const songs = getSongsForFilm(film.id, 24);
  const cast = getCastForFilm(film.id);
  const similar = getSimilarFilms(film.id, film.year, film.rating, 6);

  function filmPosterUrl(f: { posterSrc?: string | null; oldId?: number | null; title: string }) {
    return (
      f.posterSrc ||
      (f.oldId ? `https://media.dishoomfilms.com.s3.amazonaws.com/film/${f.oldId}.jpg` : null) ||
      `https://placehold.co/52x74/1A0A00/FFF8EE?text=${encodeURIComponent(f.title.slice(0, 8))}`
    );
  }

  const posterUrl = filmPosterUrl(film);

  const badges = film.badges
    ? film.badges.split(",").map((b) => b.trim()).filter(Boolean)
    : [];

  const displayOneliner = film.oneliner || (() => {
    if (!film.plot) return null;
    const match = film.plot.trim().match(/^(.+?[.!?])(?:\s|$)/);
    if (match && match[1].length <= 130) return match[1].trim();
    const cut = film.plot.slice(0, 130);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim() + "…";
  })();

  // Songs with playable YouTube IDs come first
  const playableSongs = songs.filter((s) => s.youtubeId);
  const listOnlySongs = songs.filter((s) => !s.youtubeId);

  // ── Tab content (dark-themed) ──────────────────────────────────────────────

  const overviewTab = (
    <div>
      {film.plot && (
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#D4AF37" }}>
            Plot
          </h3>
          <p className="leading-relaxed text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{film.plot}</p>
        </div>
      )}

      {film.trailer && (
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#D4AF37" }}>
            Trailer
          </h3>
          <div className="relative max-w-xl rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%", height: 0 }}>
            <iframe
              src={`https://www.youtube.com/embed/${film.trailer}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              title={`${film.title} trailer`}
            />
          </div>
        </div>
      )}

      {cast.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#D4AF37" }}>
            Cast
          </h3>
          <div
            className="flex gap-5 overflow-x-auto pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {cast.map((member) => (
              <Link
                key={member.personId}
                href={`/person/${member.slug}`}
                className="flex-shrink-0 flex flex-col items-center w-[72px] group"
              >
                <div
                  className="w-14 h-14 rounded-full overflow-hidden mb-2 ring-2 ring-transparent group-hover:ring-dishoom-red transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  {member.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm"
                      style={{ color: "rgba(255,255,255,0.5)" }}>
                      {member.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-center leading-tight line-clamp-2 w-full transition-colors group-hover:text-dishoom-red"
                  style={{ color: "rgba(255,255,255,0.85)" }}>
                  {member.name}
                </span>
                {member.character && (
                  <span className="text-xs text-center mt-0.5 line-clamp-1 w-full"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    {member.character}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {(film.writers || film.musicDirectors) && (
        <div className="text-sm space-y-2 mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
          {film.writers && (
            <div>
              <span className="font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>Writers:</span>{" "}
              {film.writers}
            </div>
          )}
          {film.musicDirectors && (
            <div>
              <span className="font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>Music:</span>{" "}
              {film.musicDirectors}
            </div>
          )}
        </div>
      )}

      {film.wikiHandle && (
        <a
          href={`https://en.wikipedia.org/wiki/${film.wikiHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs hover:underline"
          style={{ color: "#D4AF37" }}
        >
          Wikipedia →
        </a>
      )}
    </div>
  );

  const criticsTab = (
    <div>
      <ConsensusBar reviews={reviews} />
      {reviews.length > 0 ? (
        <div className="mt-4">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-4 py-5 last:border-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex-shrink-0">
                <div
                  className="w-11 h-11 rounded flex items-center justify-center text-white font-black text-sm"
                  style={{ backgroundColor: scoreColor(review.rating) }}
                >
                  {review.rating ? Math.round(review.rating) : "—"}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                {review.excerpt && (
                  <p className="text-sm italic mb-2 leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.7)" }}>
                    &ldquo;{review.excerpt}&rdquo;
                  </p>
                )}
                <div className="text-xs flex items-center gap-2 flex-wrap"
                  style={{ color: "rgba(255,255,255,0.4)" }}>
                  {review.reviewer && (
                    <span className="font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
                      {review.reviewer}
                    </span>
                  )}
                  {review.sourceName &&
                    (review.sourceLink ? (
                      <a href={review.sourceLink} target="_blank" rel="noopener noreferrer"
                        className="text-dishoom-red hover:underline">
                        {review.sourceName}
                      </a>
                    ) : (
                      <span>{review.sourceName}</span>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>No critic reviews yet.</p>
      )}
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", content: overviewTab },
    { id: "critics", label: `Critics (${reviews.length})`, content: criticsTab },
  ];

  return (
    <div style={{ background: "#0d0505" }}>
      {/* ── Cinematic hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 460 }}>
        {film.backdropSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={film.backdropSrc}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.35 }}
            />
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to right, #0d0505 25%, rgba(13,5,5,0.75) 55%, rgba(13,5,5,0.1) 100%)" }}
            />
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to top, #0d0505 0%, transparent 45%)" }}
            />
          </>
        ) : (
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 70% 40%, #2d1200 0%, #0d0505 65%)" }}
          />
        )}

        {/* Ghost year watermark */}
        {film.year && (
          <div
            className="absolute right-6 top-1/2 -translate-y-1/2 font-black leading-none select-none hidden md:block"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16rem",
              color: "#EF4832",
              opacity: 0.04,
              userSelect: "none",
            }}
          >
            {film.year}
          </div>
        )}

        <div className="relative z-10 flex gap-8 items-center"
          style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 40px" }}
        >
          {/* Poster */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt={film.title}
            className="flex-shrink-0 hidden sm:block shadow-2xl"
            style={{ width: 190, borderRadius: 6 }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="mb-5">
              <DishooomMeter rating={film.rating} size={100} />
            </div>

            <h1
              className="font-bold text-white leading-tight mb-3"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
            >
              {film.title}
            </h1>

            <div className="flex items-center gap-4 mb-4 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              {film.year && <span>{film.year}</span>}
              {film.votes > 0 && <span>{film.votes.toLocaleString()} votes</span>}
            </div>

            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {badges.map((b) => <BadgeChip key={b} badge={b} />)}
              </div>
            )}

            {displayOneliner && (
              <p className="italic leading-relaxed mb-3"
                style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem", maxWidth: "36rem" }}>
                &ldquo;{displayOneliner}&rdquo;
              </p>
            )}

            {film.summary && (
              <p className="text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.45)", maxWidth: "38rem" }}>
                {film.summary}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Songs ──────────────────────────────────────────────────────── */}
      {songs.length > 0 && (
        <section style={{ borderTop: "1px solid rgba(212,175,55,0.2)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
            <div className="flex items-baseline gap-3 mb-5">
              <h2
                className="font-bold"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "#D4AF37" }}
              >
                Soundtrack
              </h2>
              <span className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                {songs.length} songs
              </span>
            </div>

            {/* Playable songs grid */}
            {playableSongs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {playableSongs.map((song) => (
                  <VideoPlayer key={song.id} youtubeId={song.youtubeId!} title={song.title || "Untitled"} />
                ))}
              </div>
            )}

            {/* List-only songs (no YouTube ID) */}
            {listOnlySongs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {listOnlySongs.map((song) => (
                  <span
                    key={song.id}
                    className="text-sm px-3 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                  >
                    {song.title || "Untitled"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Info tabs ──────────────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(212,175,55,0.2)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 48px" }}>
          <FilmDetailTabs tabs={tabs} dark />
          <div className="mt-8 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Link href="/films" className="text-dishoom-red text-sm hover:underline">← Back to all films</Link>
          </div>
        </div>
      </section>

      {/* ── More Films Like This ────────────────────────────────────────── */}
      {similar.length > 0 && (
        <section style={{ borderTop: "1px solid rgba(212,175,55,0.15)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 40px" }}>
            <h2
              className="font-bold mb-6"
              style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "#D4AF37" }}
            >
              More Films Like This
            </h2>
            <div className="flex flex-col gap-2">
              {similar.map((s) => {
                const sColor = scoreColor(s.rating);
                const sLabel = scoreLabel(s.rating);
                return (
                  <Link
                    key={s.id}
                    href={`/film/${s.slug}`}
                    className="group relative flex items-center gap-4 rounded overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.03)", minHeight: 74 }}
                  >
                    {s.backdropSrc && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.backdropSrc}
                          alt=""
                          aria-hidden
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          style={{ opacity: 0.14 }}
                        />
                        <div
                          className="absolute inset-0"
                          style={{ background: "linear-gradient(to right, #0d0505 30%, transparent 100%)" }}
                        />
                      </>
                    )}
                    <div className="relative z-10 flex-shrink-0 ml-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={filmPosterUrl(s)}
                        alt={s.title}
                        style={{ width: 52, height: 74, objectFit: "cover", borderRadius: 4 }}
                      />
                    </div>
                    <div className="relative z-10 flex-1 min-w-0">
                      <div
                        className="font-bold leading-tight line-clamp-1"
                        style={{ fontFamily: "var(--font-display)", color: "rgba(255,255,255,0.9)", fontSize: "1rem" }}
                      >
                        {s.title}
                      </div>
                      {s.year && (
                        <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {s.year}
                        </div>
                      )}
                    </div>
                    <div className="relative z-10 flex-shrink-0 mr-4 flex flex-col items-center gap-0.5">
                      <span
                        className="font-black text-lg leading-none"
                        style={{ fontFamily: "var(--font-display)", color: sColor }}
                      >
                        {s.rating ? Math.round(s.rating) : "—"}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: sColor }}>
                        {sLabel}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

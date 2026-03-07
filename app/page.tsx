import {
  getSpotlightArticles,
  getLatestArticles,
  getFilmsByStatus,
  getHeroFilm,
  getVibeStats,
  getFilmsByDecade,
} from "@/lib/db";
import FilmCard from "@/components/FilmCard";
import ArticlePost from "@/components/ArticlePost";
import SpotlightGrid from "@/components/SpotlightGrid";
import HeroFilm from "@/components/HeroFilm";
import VibeGrid from "@/components/VibeGrid";
import DecadeRail from "@/components/DecadeRail";
import Link from "next/link";

export default function HomePage() {
  const hero = getHeroFilm();
  const vibeStats = getVibeStats();
  const films2000s = getFilmsByDecade(2000, 12);
  const films1990s = getFilmsByDecade(1990, 12);
  const films1980s = getFilmsByDecade(1980, 12);
  const inTheaters = getFilmsByStatus("in_theaters", 6);
  const comingSoon = getFilmsByStatus("coming_soon", 6);
  const spotlightArticles = getSpotlightArticles(1, 12);
  const latestArticles = getLatestArticles(1, 10);

  return (
    <div>
      {/* 1. Hero film */}
      {hero && <HeroFilm film={hero} />}

      {/* 2. Vibe grid */}
      <VibeGrid stats={vibeStats} />

      {/* 3. Decade rails (cream bg) */}
      <div className="bg-dishoom-cream">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <DecadeRail decade={2000} films={films2000s} />
          <hr className="gold-rule mx-4" />
          <DecadeRail decade={1990} films={films1990s} />
          <hr className="gold-rule mx-4" />
          <DecadeRail decade={1980} films={films1980s} />
        </div>
      </div>

      {/* 4. In Theaters / Coming Soon */}
      {(inTheaters.length > 0 || comingSoon.length > 0) && (
        <div className="bg-dishoom-cream border-t border-dishoom-gold/30 py-8">
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {inTheaters.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-dishoom-red uppercase tracking-wide"
                      style={{ fontFamily: "var(--font-display)" }}>
                    In Theaters
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {inTheaters.map((film) => (
                      <FilmCard key={film.id} film={film} />
                    ))}
                  </div>
                </div>
              )}
              {comingSoon.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-dishoom-red uppercase tracking-wide"
                      style={{ fontFamily: "var(--font-display)" }}>
                    Coming Soon
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {comingSoon.map((film) => (
                      <FilmCard key={film.id} film={film} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 text-center">
              <Link href="/films" className="inline-block bg-dishoom-red text-white text-sm font-bold uppercase tracking-wide px-6 py-3 hover:opacity-90 transition-opacity">
                Browse All 3,888 Films →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 5. Spotlight + Latest News */}
      <div className="bg-dishoom-cream border-t border-dishoom-gold/30">
        <div style={{ maxWidth: 1200, margin: "0 auto" }} className="flex flex-col md:flex-row">
          {/* Spotlight */}
          <div className="p-4 md:w-1/2">
            <h2 className="text-xl font-bold text-gray-800 mb-3 pb-2 border-b-2 border-dishoom-red uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}>
              Spotlight
            </h2>
            <SpotlightGrid articles={spotlightArticles} />
          </div>

          {/* Latest News */}
          <div className="p-4 md:w-1/2 border-t md:border-t-0 md:border-l border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-3 pb-2 border-b-2 border-dishoom-red uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}>
              Latest News
            </h2>
            <div className="std-posts">
              {latestArticles.map((article) => (
                <ArticlePost key={article.id} article={article} />
              ))}
              {latestArticles.length === 0 && (
                <p className="text-gray-500 text-sm">No articles yet.</p>
              )}
            </div>
            <div className="mt-4">
              <Link href="/news" className="text-dishoom-red text-sm font-medium hover:underline">
                View all news →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

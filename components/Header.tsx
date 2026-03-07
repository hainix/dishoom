"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

interface SearchResult {
  id: number;
  title: string;
  year: number | null;
  slug: string;
  rating: number | null;
  posterSrc: string | null;
}

const NAV_LINKS = [
  { href: "/films",  label: "Films" },
  { href: "/people", label: "Stars" },
  { href: "/news",   label: "News" },
  { href: "/top50",  label: "Top 50" },
  { href: "/watch",  label: "Watch" },
];

function ratingColor(r: number | null) {
  if (r === null) return "#737373";
  if (r >= 60) return "#25E010";
  if (r < 50) return "#e32222";
  return "#737373";
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function Header() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMenuOpen(false);
    setMobileSearch(false);
  }, [pathname]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.films || []);
      setOpen(true);
    }, 250);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query]);

  function handleSelect(slug: string) {
    setOpen(false);
    setQuery("");
    setMenuOpen(false);
    router.push(`/film/${slug}`);
  }

  const searchDropdown = open && results.length > 0 && (
    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl z-50 max-h-96 overflow-y-auto"
         style={{ width: "min(320px, calc(100vw - 2rem))" }}>
      {results.map((film) => (
        <button
          key={film.id}
          onMouseDown={() => handleSelect(film.slug)}
          className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
        >
          <div className="flex-shrink-0 w-8 h-11 overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={film.posterSrc || `https://placehold.co/32x44/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 2))}`}
              alt={film.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://placehold.co/32x44/1A0A00/FFF8EE?text=${encodeURIComponent(film.title.slice(0, 2))}`;
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-800 truncate">{film.title}</p>
            {film.year && <p className="text-xs text-gray-400">{film.year}</p>}
          </div>
          {film.rating !== null && (
            <div
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: ratingColor(film.rating), borderRadius: 2 }}
            >
              {Math.round(film.rating)}
            </div>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ backgroundColor: "#EF4832", borderBottom: "2px solid #D4AF37", position: "relative", zIndex: 40 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Desktop row (md+) ─────────────────────────────────────────── */}
        <div className="hidden md:flex items-center justify-between px-4 py-2" style={{ minHeight: 85 }}>
          <Link href="/" className="flex-shrink-0">
            <Image src="/logo.png" alt="Dishoom" width={200} height={52}
                   style={{ maxHeight: 60, width: "auto" }} priority />
          </Link>

          <nav className="flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href}
                      className="text-white uppercase text-sm font-medium transition-colors"
                      style={{
                        color: isActive ? "#FFF826" : "white",
                        borderBottom: isActive ? "2px solid #FFF826" : "2px solid transparent",
                        paddingBottom: 2,
                      }}>
                  {label}
                </Link>
              );
            })}

            <div className="relative">
              <input type="text" placeholder="Search films..." value={query}
                     onChange={(e) => setQuery(e.target.value)}
                     onBlur={() => setTimeout(() => setOpen(false), 150)}
                     className="px-3 py-1.5 text-sm border-2 border-gray-200 rounded bg-white text-gray-700 w-48 focus:outline-none focus:border-dishoom-gold" />
              {searchDropdown}
            </div>
          </nav>
        </div>

        {/* ── Mobile row (<md) ──────────────────────────────────────────── */}
        <div className="flex md:hidden items-center justify-between px-4 py-2" style={{ minHeight: 64 }}>
          <Link href="/" className="flex-shrink-0" onClick={() => setMenuOpen(false)}>
            <Image src="/logo.png" alt="Dishoom" width={160} height={42}
                   style={{ maxHeight: 48, width: "auto" }} priority />
          </Link>

          <div className="flex items-center gap-1">
            <button aria-label="Search"
                    onClick={() => { setMobileSearch((v) => !v); setMenuOpen(false); }}
                    className="w-10 h-10 flex items-center justify-center text-white rounded transition-colors"
                    style={{ background: mobileSearch ? "rgba(0,0,0,0.2)" : "transparent" }}>
              <IconSearch />
            </button>
            <button aria-label={menuOpen ? "Close menu" : "Open menu"}
                    onClick={() => { setMenuOpen((v) => !v); setMobileSearch(false); }}
                    className="w-10 h-10 flex items-center justify-center text-white rounded transition-colors"
                    style={{ background: menuOpen ? "rgba(0,0,0,0.2)" : "transparent" }}>
              {menuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile search bar ─────────────────────────────────────────────── */}
      {mobileSearch && (
        <div className="md:hidden px-4 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
          <div className="relative mt-3">
            <input type="text" placeholder="Search films..." value={query}
                   onChange={(e) => setQuery(e.target.value)}
                   onBlur={() => setTimeout(() => setOpen(false), 150)}
                   autoFocus
                   className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded bg-white text-gray-700 focus:outline-none focus:border-dishoom-gold" />
            {searchDropdown}
          </div>
        </div>
      )}

      {/* ── Mobile dropdown menu ──────────────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden absolute left-0 right-0"
             style={{ background: "#1a0a00", borderTop: "2px solid #D4AF37", zIndex: 50 }}>
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    className="flex items-center px-6 text-sm font-semibold uppercase tracking-wide transition-colors"
                    style={{
                      color: isActive ? "#FFF826" : "rgba(255,255,255,0.9)",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      paddingTop: 16,
                      paddingBottom: 16,
                      background: isActive ? "rgba(239,72,50,0.12)" : "transparent",
                    }}>
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

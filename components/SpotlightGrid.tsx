"use client";

import Link from "next/link";
import type { Article } from "@/lib/db";

export default function SpotlightGrid({ articles }: { articles: Article[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {articles.map((article) => (
        <div key={article.id} className="group">
          <Link href={`/news/${article.slug}`}>
            <div className="w-full bg-gray-200 mb-2 overflow-hidden" style={{ height: 100 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.thumbnail || `https://placehold.co/200x100/EF4832/ffffff?text=${encodeURIComponent(article.title.slice(0, 12))}`}
                alt={article.title}
                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/200x100/EF4832/ffffff?text=Dishoom`;
                }}
              />
            </div>
            <h4 className="text-sm font-semibold leading-tight text-gray-800 group-hover:text-dishoom-red line-clamp-2">
              {article.title}
            </h4>
          </Link>
        </div>
      ))}
      {articles.length === 0 && (
        <p className="text-gray-500 text-sm col-span-2">No spotlight articles yet.</p>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { Article } from "@/lib/db";

interface ArticlePostProps {
  article: Article;
  showThumb?: boolean;
}

export default function ArticlePost({ article, showThumb = true }: ArticlePostProps) {
  const thumbUrl = article.thumbnail ||
    `https://placehold.co/125x80/EF4832/ffffff?text=${encodeURIComponent(article.title.slice(0, 10))}`;

  return (
    <div className="post">
      {showThumb && (
        <div className="thumb-unit">
          <Link href={`/news/${article.slug}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrl}
              alt={article.title}
              className="w-full h-auto"
              style={{ maxHeight: 80, objectFit: "cover" }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/125x80/EF4832/ffffff?text=Dishoom`;
              }}
            />
          </Link>
        </div>
      )}
      <div className="post-content">
        <h4>
          <Link href={`/news/${article.slug}`} className="hover:text-dishoom-red">
            {article.title}
          </Link>
        </h4>
        {article.description && (
          <p className="description">{article.description}</p>
        )}
        <div className="text-xs text-gray-400 mt-1">
          {article.filmTitle && (
            <Link href={`/film/${article.filmSlug}`} className="text-blue-600 hover:underline mr-2">
              {article.filmTitle}
            </Link>
          )}
          {article.celebrity && (
            <span className="text-gray-500">{article.celebrity}</span>
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  "Cult Classic":               { bg: "#6B1A1A", color: "#D4AF37" },
  "Editor Pick":                { bg: "#D4AF37", color: "#1A0A00" },
  "Blockbuster":                { bg: "#EF4832", color: "#ffffff" },
  "100% Masala":                { bg: "#F07020", color: "#ffffff" },
  "Dishoom Dishoom":            { bg: "#2A2A2A", color: "#FFF826" },
  "No Brain Required Comedy":   { bg: "#1A5FA8", color: "#ffffff" },
  "Candy-Floss/NRI Romance":    { bg: "#D4608A", color: "#ffffff" },
  "Love/Romance":               { bg: "#9B2355", color: "#ffffff" },
  "Angry Young Man":            { bg: "#111111", color: "#EF4832" },
  "Movies with a Message":      { bg: "#1A6B3C", color: "#ffffff" },
  "Action":                     { bg: "#8B0000", color: "#ffffff" },
  "Comedy":                     { bg: "#4A7C59", color: "#ffffff" },
  "Drama":                      { bg: "#4A4A7C", color: "#ffffff" },
  "Thriller":                   { bg: "#2A2A4A", color: "#D4AF37" },
  "Relationship Trouble":       { bg: "#6B4C4C", color: "#ffffff" },
  "Feel Good":                  { bg: "#2E7D52", color: "#ffffff" },
};

const DEFAULT_STYLE = { bg: "#d0ccc8", color: "#333" };

interface BadgeChipProps {
  badge: string;
  className?: string;
}

export default function BadgeChip({ badge, className = "" }: BadgeChipProps) {
  const style = BADGE_STYLES[badge] ?? DEFAULT_STYLE;
  return (
    <span
      className={`badge-chip ${className}`}
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {badge}
    </span>
  );
}

interface RatingBadgeProps {
  rating: number | null;
  size?: "sm" | "md" | "lg";
}

function ratingColor(rating: number | null): string {
  if (rating === null) return "#737373";
  if (rating >= 60) return "#25E010";
  if (rating < 50) return "#e32222";
  return "#737373";
}

export default function RatingBadge({ rating, size = "md" }: RatingBadgeProps) {
  const color = ratingColor(rating);
  const sizeClass = size === "sm" ? "w-10 h-10 text-sm" : size === "lg" ? "w-16 h-16 text-2xl" : "w-12 h-12 text-base";

  return (
    <div
      className={`${sizeClass} flex items-center justify-center font-bold text-white`}
      style={{ backgroundColor: color }}
    >
      {rating !== null ? Math.round(rating) : "NR"}
    </div>
  );
}

import type { Review } from "@/lib/db";

interface ConsensusBarProps {
  reviews: Review[];
}

export default function ConsensusBar({ reviews }: ConsensusBarProps) {
  if (reviews.length === 0) return null;

  const fresh = reviews.filter((r) => r.rating !== null && r.rating >= 60).length;
  const mixed = reviews.filter((r) => r.rating !== null && r.rating >= 50 && r.rating < 60).length;
  const rotten = reviews.filter((r) => r.rating !== null && r.rating < 50).length;
  const total = reviews.length;

  const freshPct = Math.round((fresh / total) * 100);
  const mixedPct = Math.round((mixed / total) * 100);
  const rottenPct = 100 - freshPct - mixedPct;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
        Critics Consensus ({total} reviews)
      </h3>
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden w-full">
        <div style={{ width: `${freshPct}%`, backgroundColor: "#25E010" }} title={`Fresh: ${fresh}`} />
        <div style={{ width: `${mixedPct}%`, backgroundColor: "#D4AF37" }} title={`Mixed: ${mixed}`} />
        <div style={{ width: `${rottenPct}%`, backgroundColor: "#e32222" }} title={`Rotten: ${rotten}`} />
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
        <span><span className="font-bold" style={{ color: "#25E010" }}>{fresh}</span> Fresh</span>
        <span><span className="font-bold" style={{ color: "#D4AF37" }}>{mixed}</span> Mixed</span>
        <span><span className="font-bold" style={{ color: "#e32222" }}>{rotten}</span> Rotten</span>
      </div>
    </div>
  );
}

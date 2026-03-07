import type { Review } from "@/lib/db";

interface ConsensusBarProps {
  reviews: Review[];
}

export default function ConsensusBar({ reviews }: ConsensusBarProps) {
  if (reviews.length === 0) return null;

  const paisaVasool = reviews.filter((r) => r.rating !== null && r.rating >= 60).length;
  const timepass = reviews.filter((r) => r.rating !== null && r.rating >= 50 && r.rating < 60).length;
  const bakwaas = reviews.filter((r) => r.rating !== null && r.rating < 50).length;
  const total = reviews.length;

  const paisaPct = Math.round((paisaVasool / total) * 100);
  const timepassPct = Math.round((timepass / total) * 100);
  const bakwaasPct = 100 - paisaPct - timepassPct;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
        Critics Consensus ({total} reviews)
      </h3>
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden w-full">
        <div style={{ width: `${paisaPct}%`, backgroundColor: "#25E010" }} title={`Paisa Vasool: ${paisaVasool}`} />
        <div style={{ width: `${timepassPct}%`, backgroundColor: "#D4AF37" }} title={`Timepass: ${timepass}`} />
        <div style={{ width: `${bakwaasPct}%`, backgroundColor: "#e32222" }} title={`Bakwaas: ${bakwaas}`} />
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
        <span><span className="font-bold" style={{ color: "#25E010" }}>{paisaVasool}</span> Paisa Vasool</span>
        <span><span className="font-bold" style={{ color: "#D4AF37" }}>{timepass}</span> Timepass</span>
        <span><span className="font-bold" style={{ color: "#e32222" }}>{bakwaas}</span> Bakwaas</span>
      </div>
    </div>
  );
}

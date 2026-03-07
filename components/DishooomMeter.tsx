"use client";

import { useEffect, useRef } from "react";

interface DishooomMeterProps {
  rating: number | null;
  size?: number;
}

export default function DishooomMeter({ rating, size = 80 }: DishooomMeterProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const r = 32;
  const cx = 40;
  const cy = 40;
  const circumference = 2 * Math.PI * r;

  const score = rating ?? 0;
  const label = score >= 60 ? "Fresh" : score >= 50 ? "Mixed" : "Rotten";
  const color = score >= 60 ? "#25E010" : score >= 50 ? "#D4AF37" : "#e32222";

  useEffect(() => {
    if (!circleRef.current) return;
    const target = circumference - (score / 100) * circumference;
    // Start fully offset (empty), then animate to target
    circleRef.current.style.transition = "none";
    circleRef.current.style.strokeDashoffset = String(circumference);
    // Force reflow then animate
    void circleRef.current.getBoundingClientRect();
    circleRef.current.style.transition = "stroke-dashoffset 1s ease-out";
    circleRef.current.style.strokeDashoffset = String(target);
  }, [score, circumference]);

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        {/* Background ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#333"
          strokeWidth="8"
        />
        {/* Score ring */}
        <circle
          ref={circleRef}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ transform: "rotate(-90deg)", transformOrigin: "40px 40px" }}
        />
        {/* Score text */}
        <text x="40" y="40" textAnchor="middle" dominantBaseline="central"
              fill="white" fontSize="18" fontWeight="bold">
          {rating !== null ? Math.round(rating) : "—"}
        </text>
      </svg>
      <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

// Pull-to-refresh per la PWA installata (standalone), dove manca quello nativo
// di Safari. Nel browser normale non si attiva (c'è già il refresh del browser).
export default function PullToRefresh() {
  const [dist, setDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const distRef = useRef(0);
  const startRef = useRef(null);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (!standalone) return;

    const THRESHOLD = 70; // px oltre cui scatta il refresh
    const MAX = 120;

    const onStart = (e) => {
      if (window.scrollY > 0 || refreshing) {
        startRef.current = null;
        return;
      }
      startRef.current = e.touches[0].clientY;
    };
    const onMove = (e) => {
      if (startRef.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startRef.current;
      if (dy > 0 && window.scrollY <= 0) {
        const d = Math.min(dy * 0.5, MAX); // resistenza elastica
        distRef.current = d;
        setDist(d);
      } else {
        distRef.current = 0;
        setDist(0);
      }
    };
    const onEnd = () => {
      if (startRef.current == null) return;
      startRef.current = null;
      if (distRef.current >= THRESHOLD) {
        setRefreshing(true);
        setDist(THRESHOLD);
        setTimeout(() => window.location.reload(), 300);
      } else {
        distRef.current = 0;
        setDist(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [refreshing]);

  if (dist <= 0 && !refreshing) return null;

  const opacity = Math.min(dist / 70, 1);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{
        transform: `translateY(${Math.max(0, dist) - 8}px)`,
        transition: refreshing ? "transform .2s ease" : "none",
        opacity,
      }}
      aria-hidden="true"
    >
      <div className="mt-1 rounded-full bg-white p-2 shadow-md ring-1 ring-slate-200">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          className={refreshing ? "animate-spin text-lazio-blue" : "text-lazio-blue"}
          style={refreshing ? undefined : { transform: `rotate(${dist * 3}deg)` }}
          aria-hidden="true"
        >
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="1" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.92" transform="rotate(30 12 12)" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.83" transform="rotate(60 12 12)" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.75" transform="rotate(90 12 12)" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.66" transform="rotate(120 12 12)" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.58" transform="rotate(150 12 12)" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.5" transform="rotate(180 12 12)" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.42" transform="rotate(210 12 12)" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.33" transform="rotate(240 12 12)" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.25" transform="rotate(270 12 12)" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.16" transform="rotate(300 12 12)" />
            <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="0.08" transform="rotate(330 12 12)" />
          </g>
        </svg>
      </div>
    </div>
  );
}

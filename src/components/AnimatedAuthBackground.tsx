/**
 * AnimatedAuthBackground
 * Minimal, professional, infinite-loop background that fits the AxisPay
 * dark theme (emerald/teal primary). Pure CSS — no deps, GPU friendly.
 */
export function AnimatedAuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
      {/* Soft drifting aurora blobs */}
      <div className="absolute -top-1/3 -left-1/4 h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.78_0.16_165/0.18),transparent_60%)] blur-3xl animate-aurora-1" />
      <div className="absolute -bottom-1/3 -right-1/4 h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.7_0.18_200/0.16),transparent_60%)] blur-3xl animate-aurora-2" />
      <div className="absolute top-1/3 left-1/3 h-[40vmax] w-[40vmax] rounded-full bg-[radial-gradient(circle_at_center,oklch(0.6_0.18_230/0.12),transparent_60%)] blur-3xl animate-aurora-3" />

      {/* Subtle moving grid */}
      <div className="absolute inset-0 opacity-[0.07] animate-grid-pan [background-image:linear-gradient(to_right,oklch(0.78_0.16_165/0.6)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.78_0.16_165/0.6)_1px,transparent_1px)] [background-size:48px_48px]" />

      {/* Vignette for legibility */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,oklch(0.18_0.012_250/0.6)_100%)]" />

      <style>{`
        @keyframes aurora-1 { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(6vmax,4vmax,0) scale(1.1); } }
        @keyframes aurora-2 { 0%,100% { transform: translate3d(0,0,0) scale(1.05); } 50% { transform: translate3d(-5vmax,-3vmax,0) scale(0.95); } }
        @keyframes aurora-3 { 0%,100% { transform: translate3d(-2vmax,2vmax,0) scale(1); } 50% { transform: translate3d(3vmax,-4vmax,0) scale(1.08); } }
        @keyframes grid-pan { from { background-position: 0 0, 0 0; } to { background-position: 48px 48px, 48px 48px; } }
        .animate-aurora-1 { animation: aurora-1 22s ease-in-out infinite; }
        .animate-aurora-2 { animation: aurora-2 28s ease-in-out infinite; }
        .animate-aurora-3 { animation: aurora-3 34s ease-in-out infinite; }
        .animate-grid-pan { animation: grid-pan 18s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-aurora-1,.animate-aurora-2,.animate-aurora-3,.animate-grid-pan { animation: none; }
        }
      `}</style>
    </div>
  );
}

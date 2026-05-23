// Quantm Trade Logo — Konzept "Trained Peak":
// Hochkontrast-Silhouette eines Gipfels mit einer Trade-Trajektorie, die
// den Apex trifft. Optional ein sehr subtiler monochromer "Sweep" entlang
// der Trade-Linie — läuft NUR beim Hover (immer aktiv) oder einmalig bei
// Mount, wenn `animate` gesetzt ist. Kein Loop, keine Ablenkung.
type Props = {
  className?: string;
  /** Spielt den Sweep einmalig beim Mount ab. Hover-Sweep ist immer aktiv. */
  animate?: boolean;
};

export function ApexLogo({ className = "h-4 w-4", animate = false }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`apex-logo group ${animate ? "apex-logo--animate" : ""} ${className}`}
      aria-label="Quantm Trade"
    >
      <style>{`
        .apex-logo .apex-trail {
          stroke-dasharray: 60;
          stroke-dashoffset: 0;
          transition: stroke-dashoffset 900ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        .apex-logo .apex-spark-glow {
          transform-box: fill-box;
          transform-origin: center;
          transform: scale(1);
          opacity: 0.45;
          transition: transform 600ms ease-out, opacity 600ms ease-out;
        }
        /* Hover-Sweep: Linie zeichnet sich neu, Spark pulsiert kurz */
        .apex-logo:hover .apex-trail {
          animation: apex-sweep 900ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        .apex-logo:hover .apex-spark-glow {
          animation: apex-spark-pulse 900ms ease-out;
        }
        /* Mount-Sweep (einmalig, wenn animate=true) */
        .apex-logo--animate .apex-trail {
          animation: apex-sweep 1100ms cubic-bezier(0.22, 0.61, 0.36, 1) 100ms 1 both;
        }
        .apex-logo--animate .apex-spark-glow {
          animation: apex-spark-pulse 1100ms ease-out 100ms 1 both;
        }
        @keyframes apex-sweep {
          0%   { stroke-dashoffset: 60; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes apex-spark-pulse {
          0%   { transform: scale(0.6); opacity: 0; }
          70%  { transform: scale(1.4); opacity: 0.7; }
          100% { transform: scale(1);   opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .apex-logo .apex-trail,
          .apex-logo .apex-spark-glow,
          .apex-logo:hover .apex-trail,
          .apex-logo:hover .apex-spark-glow,
          .apex-logo--animate .apex-trail,
          .apex-logo--animate .apex-spark-glow {
            animation: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>

      {/* Äußerer Gipfel */}
      <path
        d="M 3 27 L 16 6 L 29 27 Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Innere Trainings-Stufe */}
      <path
        d="M 9 23 L 16 12 L 23 23"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.55"
        vectorEffect="non-scaling-stroke"
      />

      {/* Trade-Trajektorie — monochrom (currentColor) für subtilen Sweep */}
      <path
        className="apex-trail"
        d="M 4 25 L 10 22 L 14 23 L 16 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />

      {/* Apex-Spark */}
      <circle className="apex-spark-glow" cx="16" cy="6" r="3.2" fill="currentColor" />
      <circle cx="16" cy="6" r="2.2" fill="currentColor" />
      <circle cx="16" cy="6" r="1" fill="oklch(0.99 0 0)" />
    </svg>
  );
}

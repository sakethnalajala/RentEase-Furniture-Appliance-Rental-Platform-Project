'use client';

import { useEffect, useRef } from 'react';
import { Armchair, Sofa, Lamp, Refrigerator, WashingMachine, Fan, Bed, LampDesk } from 'lucide-react';

// Scattered furniture/appliance silhouettes, each floating independently — purely
// decorative, low-opacity, blurred just enough to read as shapes rather than icons.
const FLOATERS = [
  { Icon: Sofa, top: '12%', left: '6%', size: 46, duration: 7, delay: 0 },
  { Icon: Lamp, top: '68%', left: '10%', size: 34, duration: 9, delay: 1.2 },
  { Icon: Refrigerator, top: '22%', left: '88%', size: 40, duration: 8, delay: 0.6 },
  { Icon: Armchair, top: '78%', left: '82%', size: 38, duration: 6.5, delay: 2 },
  { Icon: WashingMachine, top: '45%', left: '94%', size: 32, duration: 10, delay: 0.3 },
  { Icon: Fan, top: '85%', left: '45%', size: 30, duration: 7.5, delay: 1.8 },
  { Icon: Bed, top: '8%', left: '45%', size: 36, duration: 9.5, delay: 0.9 },
  { Icon: LampDesk, top: '55%', left: '2%', size: 28, duration: 6, delay: 2.4 },
];

function useMouseGlow(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = null;

    const onMove = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${e.clientX}px`);
        el.style.setProperty('--my', `${e.clientY}px`);
        raf = null;
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
}

export default function AuroraBackground({ className = '' }) {
  const containerRef = useRef(null);
  useMouseGlow(containerRef);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Mesh gradient base */}
      <div className="absolute inset-0 bg-mesh" />

      {/* Cursor-tracked spotlight — GPU-cheap (background-image only) */}
      <div className="mouse-glow absolute inset-0 transition-opacity duration-500" />

      {/* Floating gradient blobs for depth */}
      <div className="absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-brand-400/30 blur-3xl dark:bg-brand-500/20" />
      <div className="absolute -right-16 top-1/3 h-96 w-96 animate-blob rounded-full bg-accent-400/25 blur-3xl [animation-delay:4s] dark:bg-accent-500/15" />
      <div className="absolute bottom-0 left-1/3 h-96 w-96 animate-blob rounded-full bg-rose-400/20 blur-3xl [animation-delay:8s] dark:bg-rose-500/15" />
      <div className="absolute left-1/2 top-1/2 h-72 w-72 animate-blob rounded-full bg-brand-300/15 blur-3xl [animation-delay:11s] dark:bg-brand-400/10" />

      {/* Soft light beams drifting diagonally */}
      <div className="absolute inset-0 overflow-hidden opacity-30 dark:opacity-20">
        <div className="absolute -left-1/4 top-0 h-[140%] w-1/3 -rotate-12 animate-[gradient-shift_12s_ease_infinite] bg-gradient-to-b from-white/40 via-transparent to-transparent blur-2xl dark:from-brand-300/20" />
      </div>

      {/* Floating furniture/appliance silhouettes */}
      {FLOATERS.map(({ Icon, top, left, size, duration, delay }, i) => (
        <Icon
          key={i}
          style={{
            top,
            left,
            width: size,
            height: size,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
          className="absolute animate-float text-brand-500/10 blur-[0.5px] dark:text-brand-300/10"
          strokeWidth={1.25}
        />
      ))}
    </div>
  );
}

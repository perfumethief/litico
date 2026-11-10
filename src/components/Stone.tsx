import { useId } from 'react';
import type { CSSProperties } from 'react';

// A vector rendering of Litico's irregular 2023 stone silhouette.
// The original granular motif is built out of tiny deterministic particles.
const SHAPE = 'M 44 94 C 61 75 80 61 116 50 C 153 37 187 24 210 27 C 226 28 231 41 234 60 C 236 77 237 85 246 104 C 253 123 264 146 265 167 L 268 244 C 263 264 228 288 203 301 C 186 310 142 310 112 311 L 48 311 C 25 310 21 296 21 273 L 24 135 C 24 117 28 109 44 94 Z';
function randomPoints() {
  let seed = 2023;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: 1450 }, (_, index) => {
    const x = 16 + rand() * 260, y = 18 + rand() * 301;
    const delay = (1 - y / 320) * 0.8 + rand() * 0.75;
    return { x, y, r: 0.19 + rand() * 0.74, opacity: 0.16 + rand() * 0.77, delay, key: index };
  });
}
const PARTICLES = randomPoints();
type Props = { className?: string; animate?: boolean; label?: boolean; light?: boolean };
export default function Stone({ className = '', animate = false, label = false, light = true }: Props) {
  const maskId = useId().replace(/:/g, '');
  return <div className={`stone-wrap ${className} ${animate ? 'stone-animate' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 290 332" className="stone-svg" role="presentation">
      <defs><clipPath id={maskId}><path d={SHAPE}/></clipPath></defs>
      <path d={SHAPE} fill={light ? '#0d1109' : '#10120e'}/>
      <g clipPath={`url(#${maskId})`}>
        {PARTICLES.map(point => <circle key={point.key} cx={point.x} cy={point.y} r={point.r}
          fill={light ? '#f6efe9' : '#ced9bc'}
          className="stone-particle"
          style={{ '--delay': point.delay + 's', '--opacity': point.opacity } as CSSProperties}/>)}
      </g>
    </svg>
    {label && <span className="stone-wordmark">Litico</span>}
  </div>;
}

import { useId } from 'react';
import type { CSSProperties } from 'react';

// A vector rendering of Litico's irregular 2023 stone silhouette.
// The original granular motif is built out of tiny deterministic particles.
const SHAPE = 'M 213 18 C 192 16 161 21 118 31 C 86 40 45 70 23 92 L 17 126 L 15 310 C 15 318 25 319 43 319 L 205 318 C 226 317 253 290 274 264 L 273 153 C 271 134 250 106 239 86 C 229 65 232 47 228 36 C 226 24 221 19 213 18 Z';
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

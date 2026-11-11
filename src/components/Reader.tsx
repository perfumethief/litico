import { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import Stone from './Stone';
import { bookData, type BookRecord } from '../lib/storage';
import { detectGesture, type Gesture, type Point } from '../lib/gestures';

export type ReaderSettings = {
  font: 'Kazimir' | 'Baskerville' | 'Bodoni' | 'Courier New';
  size: number;
  spacing: number;
  background: string;
  ink: string;
  brightness: number;
};
export type TextSelection = { text: string; cfi: string };
type Props = {
  book: BookRecord;
  settings: ReaderSettings;
  highlightCfi?: string;
  onLocation: (cfi: string) => void;
  onSelect: (selection: TextSelection) => void;
  onCenterTap: () => void;
  onGesture: (gesture: Gesture, start: Point) => void;
  onError: (message: string) => void;
};
const fontFamily: Record<ReaderSettings['font'], string> = {
  Kazimir: 'Georgia, Times New Roman, serif',
  Baskerville: 'Baskerville, Libre Baskerville, Georgia, serif',
  Bodoni: 'Bodoni MT, Didot, Times New Roman, serif',
  'Courier New': 'Courier New, monospace'
};
export default function Reader({ book, settings, highlightCfi, onLocation, onSelect, onCenterTap, onGesture, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const currentBookRef = useRef<any>(null);
  const callbacksRef = useRef({ onLocation, onSelect, onCenterTap, onGesture, onError });
  callbacksRef.current = { onLocation, onSelect, onCenterTap, onGesture, onError };
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [pageLabel, setPageLabel] = useState('');
  const [error, setError] = useState('');
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let bookInstance: any;
    let rendition: any;
    setLoading(true); setReady(false); setHintVisible(true); setError('');
    async function start() {
      try {
        const data = await bookData(book.id);
        if (cancelled || !hostRef.current) return;
        bookInstance = (ePub as any)(data);
        rendition = bookInstance.renderTo(hostRef.current, { width: '100%', height: '100%', flow: 'paginated', spread: 'none', allowScriptedContent: false });
        renditionRef.current = rendition;
        currentBookRef.current = bookInstance;
        rendition.on('relocated', (location: any) => {
          const cfi = location?.start?.cfi;
          if (cfi) callbacksRef.current.onLocation(cfi);
          const displayed = location?.start?.displayed;
          setPageLabel(displayed?.page ? String(displayed.page) : '');
        });
        rendition.on('selected', (range: string, contents: any) => {
          const text = contents?.window?.getSelection?.()?.toString?.()?.trim?.();
          if (text) callbacksRef.current.onSelect({ text, cfi: range });
        });
        rendition.hooks.content.register((contents: any) => {
          const doc = contents?.document as Document | undefined;
          if (!doc) return;
          // EPUB pages live inside an iframe, so the phone-level pointer handler
          // cannot see these events. Classify taps and swipes within this document.
          // Never use the browser's click event as a fallback for swipes: a swipe
          // can be followed by a synthetic click that used to open Settings.
          let start: { point: Point; at: number; pointerId: number } | null = null;
          let lastSwipeAt = 0;
          doc.addEventListener('pointerdown', (event: PointerEvent) => {
            if (!event.isPrimary || event.button !== 0) return;
            start = {
              point: { x: event.clientX, y: event.clientY },
              at: performance.now(),
              pointerId: event.pointerId
            };
          }, { passive: true });
          doc.addEventListener('pointercancel', () => { start = null; }, { passive: true });
          doc.addEventListener('pointerup', (event: PointerEvent) => {
            if (!start || event.pointerId !== start.pointerId) return;
            const begun = start;
            start = null;
            const ended = { x: event.clientX, y: event.clientY };
            const elapsed = performance.now() - begun.at;
            const distance = Math.hypot(ended.x - begun.point.x, ended.y - begun.point.y);
            const width = Math.max(1, contents.window?.innerWidth || doc.documentElement.clientWidth);
            const height = Math.max(1, contents.window?.innerHeight || doc.documentElement.clientHeight);
            const gesture = detectGesture(begun.point, ended);
            const selected = !!doc.getSelection()?.toString()?.trim();
            if (gesture && elapsed < 1600) {
              lastSwipeAt = performance.now();
              // Mouse text-dragging is for selecting quotations. Swipes with no
              // selected text are for Litico navigation.
              if (!selected) callbacksRef.current.onGesture(gesture, {
                x: begun.point.x / width,
                y: begun.point.y / height
              });
              return;
            }
            // A dragged finger, a selection, or a long press is never a tap.
            if (distance > 12 || elapsed > 360 || selected || performance.now() - lastSwipeAt < 500) return;
            if ((event.target as Element | null)?.closest?.('a, button, input')) return;
            const x = ended.x / width;
            const y = ended.y / height;
            window.setTimeout(() => {
              if (doc.getSelection()?.toString()?.trim() || performance.now() - lastSwipeAt < 500) return;
              // Settings deliberately occupy only the true middle of the page,
              // not the huge 64%-wide region used before.
              if (x >= 0.38 && x <= 0.62 && y >= 0.34 && y <= 0.66) {
                callbacksRef.current.onCenterTap();
              } else if (x < 0.5) {
                renditionRef.current?.prev();
              } else {
                renditionRef.current?.next();
              }
            }, 75);
          }, { passive: true });
        });
        // Apply the reading theme directly inside EPUB iframes.
        rendition.themes.default({
          'html, body': { background: settings.background + ' !important', color: settings.ink + ' !important' },
          body: { padding: '0 !important', 'touch-action': 'none !important' }
        });
        rendition.themes.font(fontFamily[settings.font]);
        rendition.themes.fontSize(settings.size + 'px');
        rendition.themes.override('line-height', String(settings.spacing), true);
        await rendition.display(book.location || undefined);
        if (cancelled) return;
        setReady(true);
        setLoading(false);
        for (const quote of book.quotes) {
          try { rendition.annotations.highlight(quote.cfi, {}, undefined, 'litico-mark'); } catch { /* EPUB edition changed */ }
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to open EPUB';
          setError(message); setLoading(false); callbacksRef.current.onError(message);
        }
      }
    }
    void start();
    return () => {
      cancelled = true;
      renditionRef.current = null; currentBookRef.current = null;
      try { rendition?.destroy(); } catch { /* already destroyed */ }
      try { bookInstance?.destroy(); } catch { /* already destroyed */ }
      if (hostRef.current) hostRef.current.innerHTML = '';
    };
    // Only reopen when switching books, not when saving progress or settings.
  }, [book.id]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    try {
      rendition.themes.font(fontFamily[settings.font]);
      rendition.themes.fontSize(settings.size + 'px');
      rendition.themes.override('line-height', String(settings.spacing), true);
      rendition.themes.override('background', settings.background, true);
      rendition.themes.override('color', settings.ink, true);
    } catch { /* wait for EPUB to finish rendering */ }
  }, [settings, ready]);
  useEffect(() => {
    if (!highlightCfi || !renditionRef.current) return;
    try { renditionRef.current.annotations.highlight(highlightCfi, {}, undefined, 'litico-mark'); } catch { /* stored range cannot be restored */ }
  }, [highlightCfi]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') renditionRef.current?.next();
      if (event.key === 'ArrowUp' || event.key === 'PageUp') renditionRef.current?.prev();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  return <section className="reader-page" aria-label={`Reading ${book.title}`} style={{ backgroundColor: settings.background, color: settings.ink, filter: `brightness(${settings.brightness / 100})` }}>
    <div ref={hostRef} className="epub-host" />
    {loading && <div className="reader-loading"><Stone className="reader-loading-stone" animate /><div className="reader-loading-title">{book.title}</div><span>opening your book</span></div>}
    {error && <div className="reader-failed"><p>{error}</p><p>Swipe right to return to the library.</p></div>}
    {ready && <><span className="reader-page-number">{pageLabel}</span><span className="bookmark-edge" aria-hidden="true"></span></>}
    {ready && hintVisible && <div className="reader-first-hint" onClick={() => setHintVisible(false)}>tap sides for pages · middle for settings · swipe to navigate</div>}
  </section>;
}

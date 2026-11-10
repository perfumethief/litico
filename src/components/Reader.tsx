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
          let start: Point | null = null;
          let didSwipe = false;
          doc.addEventListener('pointerdown', (event: PointerEvent) => {
            start = { x: event.clientX, y: event.clientY }; didSwipe = false;
          }, { passive: true });
          doc.addEventListener('pointerup', (event: PointerEvent) => {
            if (!start) return;
            const gesture = detectGesture(start, { x: event.clientX, y: event.clientY });
            if (gesture) {
              didSwipe = true;
              if (!doc.getSelection()?.toString()?.trim()) callbacksRef.current.onGesture(gesture, start);
            }
            start = null;
          }, { passive: true });
          doc.addEventListener('click', (event: MouseEvent) => {
            if (didSwipe) { didSwipe = false; return; }
            if (doc.getSelection()?.toString()?.trim()) return;
            if ((event.target as Element | null)?.closest?.('a')) return;
            const width = contents.window?.innerWidth || doc.documentElement.clientWidth;
            const ratio = event.clientX / Math.max(1, width);
            if (ratio < 0.18) renditionRef.current?.prev();
            else if (ratio > 0.82) renditionRef.current?.next();
            else callbacksRef.current.onCenterTap();
          });
        });
        // Apply the reading theme directly inside EPUB iframes.
        rendition.themes.default({
          'html, body': { background: settings.background + ' !important', color: '#12130f !important' },
          body: { padding: '0 !important' }
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
      rendition.themes.override('color', settings.background === '#354D0D' ? '#FAE2D6' : '#12130F', true);
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

  return <section className="reader-page" aria-label={`Reading ${book.title}`} style={{ backgroundColor: settings.background, filter: `brightness(${settings.brightness / 100})` }}>
    <div ref={hostRef} className="epub-host" />
    {loading && <div className="reader-loading"><Stone className="reader-loading-stone" animate /><div className="reader-loading-title">{book.title}</div><span>opening your book</span></div>}
    {error && <div className="reader-failed"><p>{error}</p><p>Swipe right to return to the library.</p></div>}
    {ready && <><span className="reader-page-number">{pageLabel}</span><span className="bookmark-edge" aria-hidden="true"></span></>}
    {ready && hintVisible && <div className="reader-first-hint" onClick={() => setHintVisible(false)}>tap the edges to turn pages · swipe to navigate</div>}
  </section>;
}

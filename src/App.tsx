import { useCallback, useEffect, useRef, useState } from 'react';
import Stone from './components/Stone';
import Library from './components/Library';
import Reader, { type ReaderSettings, type TextSelection } from './components/Reader';
import { BookmarkOverlay, ImportOverlay, SavedOverlay, SettingsOverlay, ShareOverlay, type SavedEntry } from './components/Overlays';
import { importBook, listBooks, saveBook, type BookRecord, type Bookmark, type Quote } from './lib/storage';
import { copyQuote, quoteContent, shareTelegram } from './lib/share';
import { detectGesture, type Gesture, type Point } from './lib/gestures';

type Screen = 'library' | 'reader';
type Overlay = 'import' | 'settings' | 'saved' | 'bookmark' | 'share' | null;
const DEFAULT_SETTINGS: ReaderSettings = { font: 'Kazimir', size: 19, spacing: 1.6, background: '#FAE2D6', brightness: 100 };
function savedSettings(): ReaderSettings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('litico-settings') || '{}') }; }
  catch { return DEFAULT_SETTINGS; }
}
export default function App() {
  const [splash, setSplash] = useState(true);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const booksRef = useRef<BookRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('library');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [settings, setSettings] = useState<ReaderSettings>(savedSettings);
  const [busy, setBusy] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [notice, setNotice] = useState('');
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [highlightCfi, setHighlightCfi] = useState('');
  const [lastBookmark, setLastBookmark] = useState<Bookmark | undefined>();
  const [shareEntry, setShareEntry] = useState<SavedEntry | null>(null);
  const [shareBack, setShareBack] = useState<Overlay>('saved');
  const pointerStart = useRef<Point | null>(null);
  const activeBook = books.find(book => book.id === activeId);

  useEffect(() => {
    let alive = true;
    listBooks().then(items => {
      if (!alive) return;
      booksRef.current = items; setBooks(items);
      const last = localStorage.getItem('litico-active-book');
      if (last && items.some(book => book.id === last)) setActiveId(last);
      else if (items.length) setActiveId(items[0].id);
    }).catch(error => { if (alive) setNotice('Local library unavailable: ' + (error instanceof Error ? error.message : 'unknown error')); });
    const timer = window.setTimeout(() => { if (alive) setSplash(false); }, 1900);
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);
  useEffect(() => { localStorage.setItem('litico-settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { if (overlay !== 'bookmark') return; const timer = window.setTimeout(() => setOverlay(null), 2400); return () => window.clearTimeout(timer); }, [overlay]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const changeBook = useCallback((id: string, patch: Partial<BookRecord>) => {
    const existing = booksRef.current.find(book => book.id === id);
    if (!existing) return;
    const changed: BookRecord = { ...existing, ...patch };
    booksRef.current = booksRef.current.map(book => book.id === id ? changed : book);
    setBooks([...booksRef.current]);
    void saveBook(changed).catch(() => setNotice('Could not save reading progress'));
  }, []);
  const openBook = useCallback((id: string) => {
    setActiveId(id); localStorage.setItem('litico-active-book', id);
    setSelection(null); setHighlightCfi(''); setOverlay(null); setScreen('reader');
  }, []);
  const addBookmark = useCallback(() => {
    const book = booksRef.current.find(item => item.id === activeId);
    const cfi = book?.location;
    if (!book || !cfi) { setNotice('Open a page first to bookmark it'); return; }
    const existing = book.bookmarks.find(item => item.cfi === cfi);
    const mark: Bookmark = existing || { id: crypto.randomUUID(), cfi, savedAt: Date.now() };
    if (!existing) changeBook(book.id, { bookmarks: [...book.bookmarks, mark] });
    setLastBookmark(mark); setOverlay('bookmark'); setSelection(null);
  }, [activeId, changeBook]);

  const handleGesture = useCallback((gesture: Gesture, start: Point) => {
    if (!gesture || splash || busy) return;
    if (overlay === 'bookmark') { if (gesture === 'down' || gesture === 'right') setOverlay(null); return; }
    if (overlay === 'settings') { if (gesture === 'down' || gesture === 'right') setOverlay(null); return; }
    if (overlay === 'import') { if (gesture === 'left' || gesture === 'down') setOverlay(null); return; }
    if (overlay === 'saved') { if (gesture === 'right') setOverlay(null); return; }
    if (overlay === 'share') { if (gesture === 'right' || gesture === 'down') setOverlay(shareBack); return; }
    if (screen === 'library') {
      if (gesture === 'right') { setImportError(''); setOverlay('import'); }
      if (gesture === 'left' && activeId) setScreen('reader');
    } else if (screen === 'reader') {
      if (gesture === 'right') { setScreen('library'); setSelection(null); }
      if (gesture === 'left') { setOverlay('saved'); setSelection(null); }
      if (gesture === 'up' && start.x < window.innerWidth * 0.4 && start.y > window.innerHeight * 0.5) addBookmark();
      if (gesture === 'down' && !selection) setOverlay('settings');
    }
  }, [splash, busy, overlay, screen, activeId, shareBack, selection, addBookmark]);
  const onPointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement)?.closest('input, button, textarea, select')) { pointerStart.current = null; return; }
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (start) handleGesture(detectGesture(start, { x: event.clientX, y: event.clientY }), start);
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (overlay) setOverlay(null);
        else if (screen === 'reader') setScreen('library');
        setSelection(null);
      }
      if (event.altKey && event.key.toLowerCase() === 'i') { event.preventDefault(); setOverlay('import'); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [overlay, screen]);

  async function handleImport(files: File[]) {
    const epubFiles = files.filter(file => file.name.toLowerCase().endsWith('.epub'));
    if (!epubFiles.length) { setImportError('Please select an EPUB file.'); return; }
    setBusy(true); setImportError(''); setImportMessage('');
    const imported: BookRecord[] = [];
    const failures: string[] = [];
    for (let i = 0; i < epubFiles.length; i++) {
      const file = epubFiles[i];
      setImportMessage(`reading ${file.name} · ${i + 1} of ${epubFiles.length}`);
      try { imported.push(await importBook(file)); }
      catch (error) { failures.push(`${file.name}: ${error instanceof Error ? error.message : 'invalid EPUB'}`); }
    }
    if (imported.length) {
      booksRef.current = [...imported.reverse(), ...booksRef.current];
      setBooks([...booksRef.current]);
      openBook(imported[imported.length - 1].id);
      setNotice(`${imported.length} ${imported.length === 1 ? 'book' : 'books'} added to Litico`);
    }
    if (failures.length) { setImportError(failures.join(' · ')); if (imported.length) setNotice(`${imported.length} imported; ${failures.length} failed`); }
    setBusy(false); setImportMessage('');
  }

  const entries: SavedEntry[] = books.flatMap<SavedEntry>(book => [
    ...book.quotes.map(quote => ({ book, quote })),
    ...book.bookmarks.map(bookmark => ({ book, bookmark }))
  ]).sort((a,b) => (b.quote?.savedAt || b.bookmark?.savedAt || 0) - (a.quote?.savedAt || a.bookmark?.savedAt || 0));
  function openShare(entry: SavedEntry, previous: Overlay) {
    setShareEntry(entry); setShareBack(previous); setOverlay('share'); setSelection(null);
  }
  function underlineSelected() {
    if (!selection || !activeBook) return;
    const newQuote: Quote = { id: crypto.randomUUID(), cfi: selection.cfi, text: selection.text, savedAt: Date.now() };
    changeBook(activeBook.id, { quotes: [...activeBook.quotes, newQuote] });
    setHighlightCfi(selection.cfi); setSelection(null); setNotice('passage saved');
  }
  function shareSelected() {
    if (!selection || !activeBook) return;
    const quote: Quote = { id: crypto.randomUUID(), text: selection.text, cfi: selection.cfi, savedAt: Date.now() };
    openShare({ book: activeBook, quote }, null);
  }
  function returnToBookmark(entry: SavedEntry) {
    if (!entry.bookmark) return;
    openBook(entry.book.id);
    // Switch to the chosen bookmark by updating the stored read position before mounting Reader.
    changeBook(entry.book.id, { location: entry.bookmark.cfi });
  }
  const shareText = shareEntry?.quote ? quoteContent(shareEntry.quote.text, shareEntry.book.title, shareEntry.book.author) : '';
  async function doCopy() {
    try { await copyQuote(shareText); setNotice('copied to clipboard'); }
    catch { setNotice('Could not copy this passage'); }
  }

  return <div className="desktop-surround">
    <main className="litico-device" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { pointerStart.current = null; }}>
      {splash ? <section className="splash-screen" aria-label="Litico loading"><Stone animate label/><span className="splash-caption">a quiet space to read</span></section> :
        <>
          <div className={`screen-base ${screen === 'library' ? 'visible' : 'behind'}`}>
            <Library books={books} onOpen={openBook} onAdd={() => { setImportError(''); setOverlay('import'); }}/>
          </div>
          {activeBook && <div className={`screen-base reader-base ${screen === 'reader' ? 'visible' : 'behind'}`}>
            <Reader book={activeBook} settings={settings} highlightCfi={highlightCfi}
              onLocation={cfi => { const current = booksRef.current.find(item => item.id === activeId); if (current?.location !== cfi) changeBook(current!.id, { location: cfi }); }}
              onSelect={setSelection} onCenterTap={() => setOverlay('settings')}
              onGesture={handleGesture} onError={setNotice}/>
          </div>}
          {selection && screen === 'reader' && !overlay && <div className="selection-toolbar">
            <button type="button" onClick={() => { const word = selection.text.trim().split(/\s+/)[0]; window.open('https://www.google.com/search?q=' + encodeURIComponent('define ' + word), '_blank', 'noopener,noreferrer'); setSelection(null); }}>dictionary</button>
            <button type="button" onClick={underlineSelected}>underline</button>
            <button type="button" onClick={shareSelected}>share</button>
            <button type="button" aria-label="Cancel selection" onClick={() => setSelection(null)}>×</button>
          </div>}
          {overlay === 'import' && <div className="overlay-holder overlay-from-left"><ImportOverlay onImport={handleImport} busy={busy} message={importMessage} error={importError}/></div>}
          {overlay === 'settings' && <div className="overlay-holder overlay-from-bottom"><SettingsOverlay settings={settings} onChange={setSettings}/></div>}
          {overlay === 'saved' && <div className="overlay-holder overlay-from-right"><SavedOverlay entries={entries} onOpenQuote={entry => openShare(entry, 'saved')} onJump={returnToBookmark}/></div>}
          {overlay === 'share' && shareEntry && <div className="overlay-holder overlay-from-bottom"><ShareOverlay entry={shareEntry} onCopy={() => void doCopy()} onTelegram={() => shareTelegram(shareText)} onBack={() => setOverlay(shareBack)}/></div>}
          {overlay === 'bookmark' && <BookmarkOverlay bookmark={lastBookmark} onClose={() => setOverlay(null)}/>}
          {notice && <div className="toast" role="status">{notice}</div>}
        </>}
    </main>
  </div>;
}

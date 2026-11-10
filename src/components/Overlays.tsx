import { useRef, useState, type DragEvent } from 'react';
import type { BookRecord, Bookmark, Quote } from '../lib/storage';
import type { ReaderSettings } from './Reader';
import Stone from './Stone';

type ImportProps = {
  onImport: (files: File[]) => Promise<void>;
  busy: boolean;
  message: string;
  error: string;
};
export function ImportOverlay({ onImport, busy, message, error }: ImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const choose = () => { if (!busy) inputRef.current?.click(); };
  const received = (files: FileList | null) => { if (files?.length) void onImport(Array.from(files)); };
  const dropped = (event: DragEvent) => {
    event.preventDefault(); setDrag(false);
    received(event.dataTransfer.files);
  };
  return <section className={`overlay-screen import-screen ${drag ? 'import-drag' : ''}`}
    onDragEnter={event => { event.preventDefault(); setDrag(true); }}
    onDragOver={event => event.preventDefault()}
    onDragLeave={() => setDrag(false)} onDrop={dropped} aria-label="Import EPUB books">
    <div className="overlay-intro">add books</div>
    <input className="visually-hidden" aria-label="Choose EPUB files" type="file" accept=".epub,application/epub+zip" multiple ref={inputRef}
      onChange={event => { received(event.currentTarget.files); event.currentTarget.value = ''; }}/>
    <button type="button" className="import-stone-target" onClick={choose} disabled={busy} aria-label="Choose EPUB files to import">
      <Stone key={busy ? 'loading' : 'ready'} animate={busy} />
      <span>{busy ? 'gathering the pages' : 'touch to choose files'}</span>
    </button>
    <p className="import-subtitle">{busy ? message : 'import .epub from your device\nor drop files here'}</p>
    {error && <p className="import-error" role="alert">{error}</p>}
    <p className="gesture-caption">swipe left to return to the library</p>
  </section>;
}
const fontNames: ReaderSettings['font'][] = ['Kazimir','Baskerville','Bodoni','Courier New'];
const bgColors = [{ c: '#FAE2D6', label: 'peach' },{ c: '#FFF5E6', label: 'ivory' },{ c: '#354D0D', label: 'olive' }];
type SettingsProps = { settings: ReaderSettings; onChange: (settings: ReaderSettings) => void };
export function SettingsOverlay({ settings, onChange }: SettingsProps) {
  return <section className="overlay-screen blue-screen settings-screen" aria-label="Reading settings">
    <h2>settings</h2>
    <div className="setting-section">
      <div className="setting-row"><span>font</span><span className="setting-value">{settings.font}</span></div>
      <div className="type-samples">
        {fontNames.map(font => <button key={font} type="button" className={`font-choice ${font === settings.font ? 'chosen' : ''}`}
          onClick={() => onChange({ ...settings, font })}>
          <span style={{ fontFamily: font === 'Courier New' ? 'Courier New, monospace' : font === 'Bodoni' ? 'Didot, Georgia, serif' : 'Georgia, serif' }}>Aa</span>
          <small>{font}</small>
        </button>)}
      </div>
    </div>
    <div className="setting-section">
      <label htmlFor="font-size"><span>size</span><b>{settings.size}</b></label>
      <input id="font-size" type="range" min="13" max="29" step="1" value={settings.size}
        onChange={event => onChange({ ...settings, size: Number(event.target.value) })}/>
    </div>
    <div className="setting-section">
      <label htmlFor="line-spacing"><span>spacing</span><b>{settings.spacing.toFixed(1)}</b></label>
      <input id="line-spacing" type="range" min="1.2" max="2.2" step="0.1" value={settings.spacing}
        onChange={event => onChange({ ...settings, spacing: Number(event.target.value) })}/>
    </div>
    <div className="setting-section">
      <label htmlFor="brightness"><span>brightness</span><b>{settings.brightness}%</b></label>
      <input id="brightness" type="range" min="55" max="115" step="5" value={settings.brightness}
        onChange={event => onChange({ ...settings, brightness: Number(event.target.value) })}/>
    </div>
    <div className="setting-section">
      <div className="setting-row"><span>paper</span><span className="setting-value">background</span></div>
      <div className="paper-options">{bgColors.map(color => <button key={color.c} type="button" title={color.label} aria-label={color.label}
        aria-pressed={settings.background === color.c} className={`paper-swatch ${settings.background === color.c ? 'chosen' : ''}`}
        style={{ backgroundColor: color.c }} onClick={() => onChange({ ...settings, background: color.c })}/>)}</div>
    </div>
    <p className="gesture-caption">swipe down to resume reading</p>
  </section>;
}
export type SavedEntry = { book: BookRecord; quote?: Quote; bookmark?: Bookmark };
type SavedProps = { entries: SavedEntry[]; onOpenQuote: (entry: SavedEntry) => void; onJump: (entry: SavedEntry) => void };
export function SavedOverlay({ entries, onOpenQuote, onJump }: SavedProps) {
  const [tab,setTab] = useState<'quotes' | 'bookmarks'>('quotes');
  const [search,setSearch] = useState('');
  const filtered = entries.filter(entry => {
    if (tab === 'quotes' && !entry.quote) return false;
    if (tab === 'bookmarks' && !entry.bookmark) return false;
    return [entry.book.title,entry.quote?.text,entry.bookmark?.excerpt].join(' ').toLowerCase().includes(search.toLowerCase());
  });
  return <section className="overlay-screen blue-screen saved-screen" aria-label="Saved passages">
    <h2>saved</h2>
    <div className="saved-tabs">
      <button type="button" className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>underlined</button>
      <button type="button" className={tab === 'bookmarks' ? 'active' : ''} onClick={() => setTab('bookmarks')}>bookmarks</button>
    </div>
    <input className="saved-search" type="search" value={search} onChange={event => setSearch(event.target.value)}
      placeholder="search your saved words" aria-label="Search saved passages"/>
    <div className="saved-list">
      {filtered.length ? filtered.map(entry => <article className="saved-entry" key={entry.quote?.id || entry.bookmark?.id}>
        {entry.quote ? <button type="button" className="saved-quote" onClick={() => onOpenQuote(entry)}>“{entry.quote.text}”</button> :
          <button type="button" className="saved-quote" onClick={() => onJump(entry)}>{entry.bookmark?.excerpt || 'Return to this page'} →</button>}
        <div className="saved-meta"><span>{entry.book.title}</span>
          <button type="button" onClick={() => entry.quote ? onOpenQuote(entry) : onJump(entry)}>
            {entry.quote ? 'share ↗' : 'return ↗'}
          </button></div>
      </article>) : <div className="saved-none">nothing here yet.<br/>save a line while you read.</div>}
    </div>
    <p className="gesture-caption">swipe right to return to your book</p>
  </section>;
}
type ShareProps = { entry: SavedEntry | { book: BookRecord; quote: Quote }; onCopy: () => void; onTelegram: () => void; onBack: () => void };
export function ShareOverlay({ entry, onCopy, onTelegram, onBack }: ShareProps) {
  return <section className="overlay-screen blue-screen share-screen" aria-label="Share passage">
    <h2>share passage</h2>
    <blockquote>“{entry.quote?.text || ''}”</blockquote>
    <p className="share-attribution">{entry.book.title}<br/>{entry.book.author}</p>
    <div className="share-actions">
      <button type="button" onClick={onCopy}>copy text <span>↗</span></button>
      <button type="button" onClick={onTelegram}>send on Telegram <span>↗</span></button>
    </div>
    <button type="button" className="share-return" onClick={onBack}>← return</button>
  </section>;
}
type BookmarkProps = { bookmark?: Bookmark; onClose: () => void };
export function BookmarkOverlay({ bookmark, onClose }: BookmarkProps) {
  return <section className="bookmark-pop" aria-label="Bookmark saved" role="status" onClick={onClose}>
    <Stone className="bookmark-pop-stone" animate />
    <span className="bookmark-pop-label">{bookmark ? 'place marked' : 'page not ready'}</span>
  </section>;
}

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
const paperScale = ['#FAE2D6','#FFF5E6','#EAE4CF','#D9E7FF','#CFCBD8','#3D5811'];
const inkScale = ['#12130F','#464B45','#70445C','#B84B83','#F5D9C7','#FFFFFF'];
type SettingsProps = { settings: ReaderSettings; onChange: (settings: ReaderSettings) => void };
export function SettingsOverlay({ settings, onChange }: SettingsProps) {
  const fontIndex = fontNames.indexOf(settings.font);
  const paperIndex = Math.max(0, paperScale.findIndex(c => c.toLowerCase() === settings.background.toLowerCase()));
  const inkIndex = Math.max(0, inkScale.findIndex(c => c.toLowerCase() === settings.ink.toLowerCase()));
  return <section className="overlay-screen blue-screen original-settings" aria-label="Reading settings">
    <h2>settings</h2>
    <div className="original-settings-controls">
      <div className="gradient-colours">
        <div className="gradient-colour">
          <label htmlFor="paper-colour">background</label>
          <input id="paper-colour" className="vertical-gradient paper-gradient" type="range" min="0" max={paperScale.length - 1} step="1" value={paperIndex}
            onChange={event => onChange({ ...settings, background: paperScale[Number(event.target.value)] })} aria-label="Background colour" />
        </div>
        <div className="gradient-colour">
          <input id="ink-colour" className="vertical-gradient ink-gradient" type="range" min="0" max={inkScale.length - 1} step="1" value={inkIndex}
            onChange={event => onChange({ ...settings, ink: inkScale[Number(event.target.value)] })} aria-label="Text colour" />
          <label htmlFor="ink-colour">text</label>
        </div>
      </div>
      <div className="settings-middle">
        <div className="scribble-setting"><label htmlFor="spacing-stone">spacing</label>
          <div className="scribble-outline spacing-scribble">
            <input id="spacing-stone" type="range" min="1.2" max="2.2" step=".1" value={settings.spacing}
              onChange={event => onChange({ ...settings, spacing: Number(event.target.value) })} aria-label="Text spacing"/>
            <span>{settings.spacing.toFixed(1)}</span>
          </div>
        </div>
        <div className="font-setting"><span>font</span>
          <div className="font-switch">
            <button type="button" aria-label="Previous font" onClick={() => onChange({ ...settings, font: fontNames[(fontIndex + fontNames.length - 1) % fontNames.length] })}>‹</button>
            <span>{settings.font}</span>
            <button type="button" aria-label="Next font" onClick={() => onChange({ ...settings, font: fontNames[(fontIndex + 1) % fontNames.length] })}>›</button>
          </div>
        </div>
      </div>
      <div className="settings-bottom">
        <div className="size-setting"><span>size</span>
          <div className="size-stepper"><button type="button" aria-label="Decrease text size" onClick={() => onChange({ ...settings, size: Math.max(13,settings.size - 1) })}>−</button>
          <span>{settings.size}</span>
          <button type="button" aria-label="Increase text size" onClick={() => onChange({ ...settings, size: Math.min(29,settings.size + 1) })}>+</button></div>
        </div>
        <div className="scribble-setting brightness-setting"><label htmlFor="brightness-stone">brightness</label>
          <div className="scribble-outline brightness-scribble">
            <input id="brightness-stone" type="range" min="55" max="115" step="5" value={settings.brightness}
              onChange={event => onChange({ ...settings, brightness: Number(event.target.value) })} aria-label="Brightness"/>
            <span>{settings.brightness}%</span>
          </div>
        </div>
      </div>
    </div>
    <p className="gesture-caption">swipe down to return to your book</p>
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

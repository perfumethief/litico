import type { BookRecord } from '../lib/storage';
import Stone from './Stone';
type Props = { books: BookRecord[]; onOpen: (id: string) => void; onAdd: () => void };
const fallbacks = ['#ecab79','#d5d8ba','#b4c5b8','#f8eac8','#d1b7a9','#bfd2df'];
export default function Library({ books, onOpen, onAdd }: Props) {
  return <section className="library-screen" aria-label="Your Litico library">
    <header className="library-header"><h1>main library</h1><p>{books.length ? `${books.length} ${books.length === 1 ? 'book' : 'books'}` : 'your books will live here'}</p></header>
    {books.length ? <div className="book-grid">
      {books.map((book, index) => <button key={book.id} className="book-cover" type="button"
        onClick={() => onOpen(book.id)} aria-label={`Open ${book.title}`}
        style={{ backgroundColor: fallbacks[index % fallbacks.length] }}>
        {book.cover ? <img src={book.cover} alt="" loading="lazy" /> :
          <span className="cover-without-art"><strong>{book.title}</strong><small>{book.author}</small></span>}
      </button>)}
    </div> : <div className="library-empty" onClick={onAdd}>
      <Stone className="empty-stone" animate label={false}/>
      <p>your library is empty.</p><span>swipe right to add an epub</span>
    </div>}
    <div className="library-footer">← swipe to read <span>swipe to add →</span></div>
  </section>;
}

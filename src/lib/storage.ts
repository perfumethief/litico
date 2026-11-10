import ePub from 'epubjs';

export type Quote = { id: string; text: string; cfi: string; savedAt: number };
export type Bookmark = { id: string; cfi: string; savedAt: number; excerpt?: string };
export type BookRecord = {
  id: string;
  title: string;
  author: string;
  cover?: string;
  filename: string;
  addedAt: number;
  location?: string;
  quotes: Quote[];
  bookmarks: Bookmark[];
};
type StoredBook = { id: string; meta: BookRecord; file: Blob };
const DB_NAME = 'litico-library-v1';
const STORE = 'books';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local library'));
  });
}
async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason: Error) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let value: T;
    let ready = false;
    let failed = false;
    run(store, v => { value = v; ready = true; }, e => { failed = true; reject(e); });
    tx.oncomplete = () => { db.close(); if (!failed && ready) resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Local library error')); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('Local library aborted')); };
  });
}
export async function listBooks(): Promise<BookRecord[]> {
  const items = await transaction<StoredBook[]>('readonly', (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as StoredBook[]);
    request.onerror = () => reject(request.error || new Error('Could not list books'));
  });
  return items.map(item => item.meta).sort((a, b) => b.addedAt - a.addedAt);
}
async function getStored(id: string): Promise<StoredBook | undefined> {
  return transaction('readonly', (store, resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as StoredBook | undefined);
    request.onerror = () => reject(request.error || new Error('Could not open book'));
  });
}
async function putStored(item: StoredBook): Promise<void> {
  return transaction('readwrite', (store, resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => reject(request.error || new Error('Could not save book'));
  });
}
export async function bookData(id: string): Promise<ArrayBuffer> {
  const item = await getStored(id);
  if (!item) throw new Error('Book not found on this device');
  return item.file.arrayBuffer();
}
async function coverAsDataUrl(url: string | null | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
export async function importBook(file: File): Promise<BookRecord> {
  if (!file.name.toLowerCase().endsWith('.epub')) throw new Error('Please choose an .epub file');
  if (file.size > 150 * 1024 * 1024) throw new Error('This EPUB is larger than the 150 MB import limit');
  const buffer = await file.arrayBuffer();
  const book = (ePub as any)(buffer);
  try {
    const metadata = await book.loaded.metadata;
    const cover = await coverAsDataUrl(await book.coverUrl());
    const meta: BookRecord = {
      id: crypto.randomUUID(),
      filename: file.name,
      title: String(metadata?.title || file.name.replace(/\.epub$/i, '')),
      author: String(metadata?.creator || 'Unknown author'),
      cover,
      addedAt: Date.now(),
      quotes: [],
      bookmarks: []
    };
    await putStored({ id: meta.id, meta, file: new Blob([buffer], { type: 'application/epub+zip' }) });
    return meta;
  } finally {
    book.destroy();
  }
}
export async function saveBook(meta: BookRecord): Promise<void> {
  const current = await getStored(meta.id);
  if (!current) throw new Error('Book not found');
  await putStored({ ...current, meta });
}
export async function removeBook(id: string): Promise<void> {
  return transaction('readwrite', (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => reject(request.error || new Error('Could not remove book'));
  });
}

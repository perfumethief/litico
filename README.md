# Litico

A minimalist, gesture-first EPUB reader. Mobile-proportioned web app first, with Windows Tauri packaging planned later and Android portability in mind.

The original 2023 Canva design is the visual reference: olive library, #FAE2D6 reader, #D9E7FF fullscreen overlays, touching uniform book covers, and a particle-filled stone motif.

## Development

```bash
npm install
npm run dev
```

EPUBs and reading progress stay local to the device (IndexedDB).

## Interaction map

- Library: swipe right to import, swipe left to return to the opened book.
- Reader: tap left/right edge to turn a page; tap center for settings; swipe right for library; swipe left for Saved; swipe up from the bottom-left for bookmarks; long-press to select text.
- Saved: copy a quotation or share it to Telegram.

No account or server is required. This is a first functional prototype, not yet a packaged Windows executable.

# Litico architecture (v0.1)

Litico is intentionally **web-first and mobile-proportioned**. The interface is designed for an Android-sized viewport even inside a Windows desktop window.

## Core layers

- `src/components/Library.tsx`: the original zero-gap, equal-proportion cover grid.
- `src/components/Reader.tsx`: EPUB.js rendering, page tap zones, selection, EPUB-frame gesture bridge.
- `src/components/Overlays.tsx`: fullscreen import/settings/saved/share overlays and the small bookmark peek.
- `src/components/Stone.tsx`: generated fine-grain particle animation clipped to the original stone silhouette.
- `src/lib/gestures.ts`: platform-agnostic gesture recognition.
- `src/lib/storage.ts`: local library metadata, EPUB file storage, notes, bookmarks and positions. **This is the persistence adapter boundary.**
- `src/lib/share.ts`: text-to-clipboard and Telegram share links. **This is the platform share boundary.**
- `src/App.tsx`: navigation state and transitions.

## Windows (next packaging step)

Add `src-tauri/` to the repository without moving the UI. Create a portrait-capable, resizable Windows window (for example 420×850). The web app uses browser IndexedDB, which also works inside WebView2. For explicit filesystem import/export or shell integration, build Tauri implementations behind the storage/share boundaries.

## Android (later)

Reuse React layouts, CSS, EPUB.js and gestures. Adapt system back navigation, touch safe areas, storage permissions and sharing behind their respective adapters. You won't need to recreate every screen.

## Scope and limitations

This is a working **prototype**, not a finished e-reader: EPUB rendering and basic highlighting depend on EPUB.js and are not yet device-tested. DRM-protected books aren't supported. The current font families fall back to available system fonts until original licensed font files are added. The stone follows the original user-provided silhouette but is redrawn procedurally so the particles can animate. There is no backend: books never upload to a server.

## Quick start

```bash
npm install
npm run dev
```

Then open the local address shown by Vite. Run `npm run build` before packaging.

# FlyStock

Offline-first item tracker for logging equipment and stock in and out, with a full history — no account, no server, no build step.

## Features

- **Item-by-item tracking** — log each item with its own description (e.g. a serial number or identifying detail), not a bulk quantity count.
- **Add → Remove → Restore lifecycle** — move an item from current stock to a separate Removed Items list with a timestamped reason, and restore it back if it was removed by mistake.
- **Notes history** — attach multiple timestamped notes to an item over its lifetime (condition, location, source, etc.).
- **Types with collapsible, color-coded groups** — organize items into types; the list groups and color-codes them automatically, and each group can be collapsed or expanded.
- **Batch entry** — after adding one item, the form stays open with just the description cleared, so you can log several similar items back-to-back without re-entering the type, date, or note.
- **Search** — filter across current and removed items.
- **Backup & export** — export your inventory, including notes and removal history, as a plain-text file, and import it back in (additively — nothing already saved is overwritten). Since everything lives in browser storage, exporting a backup periodically is the only way to keep your data safe.
- **Installable PWA** — install to your home screen and use offline via a service worker.
- **Multi-language** — available in English, Ukrainian, and Portuguese (BR).
- **Local-only storage** — all data stays in your browser's `localStorage`; nothing is sent to a server.

## Usage

FlyStock is a single static HTML file with no build step or dependencies. To run it:

1. Open `index.html` directly in a browser, or
2. Serve the folder with any static file server (e.g. `npx serve .`) and open it in your browser.
3. Optionally install it as a PWA from your browser's install prompt for offline use.

## Data & privacy

All inventory data is stored locally in your browser via `localStorage`. Nothing is sent anywhere. Clearing your browser data will remove it, so export regularly for backup.

## License

MIT — see [LICENSE](LICENSE).

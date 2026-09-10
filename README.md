# FlyStock

Simple, offline-first inventory tracker for counting and managing stock — no account, no server, no build step.

## Features

- **Inventory tracking** — add, edit, and manage stock items and quantities.
- **Import / export** — back up or transfer your inventory as a plain text file.
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

# Changes

## [Task 1] Scaffold PWA Shell

- **Date**: 2026-06-21
- **Technical Summary**: Setup of the foundational PWA shell including service worker, manifest, and base ES modules.

### Technical Log

- **Modified**: `src/index.html` - Replaced placeholder with semantic tags, linked to manifest and theme color.
- **Modified**: `src/index.js` - Updated to import the correct stylesheet and added a block to register the service worker.
- **New**: `src/ui/styles.css` - Implemented the requested deep teal and gold color theme using CSS variables.
- **New**: `src/manifest.json` - Scaffolded the PWA configuration (name, theme color, icons placeholder).
- **New**: `src/sw.js` - Added a standard service worker that caches `index.html`, `main.js`, and the `manifest.json`.
- **Deleted**: `src/styles.css` - Moved to `src/ui/styles.css` to respect directory structure.
- **Why**: These changes provide the offline-capable skeleton (PWA shell) required before implementing the core transaction logic, respecting the `src/data/`, `src/ui/`, `src/utils/` structure.

### Plain English Summary

I have built the foundational skeleton for the Jezdan app. It now has the necessary setup to be "installable" on a phone (via a manifest file) and can theoretically work without an internet connection (via a service worker). The basic screen now uses the requested dark green and gold color scheme.

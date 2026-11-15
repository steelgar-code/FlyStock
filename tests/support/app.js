// Shared helpers for the FlyStock end-to-end tests.
const base = require('@playwright/test');
const { expect } = base;

const STORAGE_KEY = 'stockroom_inventory_v1';

// Every test fails on uncaught page errors or console errors, unless it opts
// out by setting `allowConsoleErrors` (e.g. for the unreadable-storage case).
const test = base.test.extend({
  allowConsoleErrors: [false, { option: true }],
  page: async ({ page, allowConsoleErrors }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !allowConsoleErrors) errors.push('console: ' + m.text()); });
    await use(page);
    expect(errors, 'uncaught page/console errors').toEqual([]);
  },
});

// Apply with test.use(CONTEXT_OPTIONS): no service worker, stable locale.
const CONTEXT_OPTIONS = { timezoneId: 'UTC', locale: 'en-US', serviceWorkers: 'block' };

function item(o) {
  return {
    id: o.id,
    type: o.type || 'Tools',
    description: o.description,
    status: o.status || 'active',
    dateAdded: o.dateAdded || '2025-01-10T09:00:00.000Z',
    dateRemoved: o.status === 'removed' ? (o.dateRemoved || '2025-02-01T09:00:00.000Z') : null,
    notes: o.notes || [],
  };
}

// inventory: object -> JSON, string -> raw, undefined -> absent.
// Seeds once per tab (a reload keeps whatever the app saved afterwards).
async function openApp(page, { inventory, lang, hash } = {}) {
  await page.addInitScript(({ key, raw, lang }) => {
    try {
      if (sessionStorage.getItem('__seeded')) return;
      sessionStorage.setItem('__seeded', '1');
      if (raw !== null) localStorage.setItem(key, raw);
      if (lang) localStorage.setItem('flystock-lang', lang);
    } catch (e) { /* ignore */ }
  }, {
    key: STORAGE_KEY,
    raw: inventory === undefined ? null : (typeof inventory === 'string' ? inventory : JSON.stringify(inventory)),
    lang: lang || null,
  });
  await page.goto('/index.html' + (hash ? '#' + hash : ''));
  await page.waitForLoadState('load');
}

// Raw stored string (or null) and parsed value (or null).
async function store(page) {
  const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
  let parsed = null;
  try { parsed = raw === null ? null : JSON.parse(raw); } catch (e) { /* unreadable */ }
  return { raw, parsed };
}

module.exports = { test, expect, CONTEXT_OPTIONS, STORAGE_KEY, item, openApp, store };

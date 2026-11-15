const { test, expect, CONTEXT_OPTIONS, item, openApp, store } = require('./support/app');

test.use(CONTEXT_OPTIONS);

const UUID1 = '3b1f2c3e-1111-4a5b-8c9d-0123456789ab';
const UUID2 = '4c2a3d4f-2222-4b6c-9d0e-123456789abc';

const INV = {
  types: ['Tools', 'Parts'],
  items: [
    item({ id: UUID1, description: 'Cordless drill', notes: [
      { id: 'n1', date: '2025-01-10T09:00:00.000Z', text: 'bought it' },
      { id: 'n2', date: '2025-03-01T10:00:00.000Z', text: 'new battery | 2nd' },
    ] }),
    item({ id: UUID2, type: 'Parts', description: 'Old saw', status: 'removed',
      dateRemoved: '2025-02-01T09:00:00.000Z',
      notes: [{ id: 'n3', date: '2025-01-10T09:00:00.000Z', text: 'broken' }] }),
    item({ id: 'id-1700000000000-abc123', description: 'Fallback id item' }),
  ],
};

function watchDialogs(page) {
  const messages = [];
  page.on('dialog', (d) => { messages.push(d.message()); d.accept(); });
  return messages;
}

async function doExport(page) {
  const dl = page.waitForEvent('download');
  await page.locator('#btnExport').click();
  const download = await dl;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

async function doImport(page, text, messages) {
  const before = messages.length;
  await page.locator('#importFileInput').setInputFiles({ name: 'in.txt', mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });
  await expect.poll(() => messages.length).toBeGreaterThan(before);
  return messages[messages.length - 1];
}

const view = (inv) => inv.items.map((i) => ({
  type: i.type, description: i.description, status: i.status, dateAdded: i.dateAdded, dateRemoved: i.dateRemoved,
  notes: i.notes.map((n) => ({ date: n.date, text: n.text })),
}));

test('export writes ID first in each block; unsafe ids are omitted', async ({ page }) => {
  const inv = JSON.parse(JSON.stringify(INV));
  inv.items.push(item({ id: 'weird id!', description: 'Odd one' }));
  await openApp(page, { inventory: inv });
  const text = await doExport(page);
  expect(text).toContain('# The ID line');
  const blocks = text.split('\n').reduce((acc, l) => {
    if (l.trim() === '') acc.push([]); else if (!l.startsWith('#') && acc.length) acc[acc.length - 1].push(l);
    return acc;
  }, [[]]).filter((b) => b.length);
  expect(blocks).toHaveLength(4);
  expect(blocks[0][0]).toBe('ID: ' + UUID1);
  expect(blocks[0][1]).toBe('TYPE: Tools');
  expect(blocks[1][0]).toBe('ID: ' + UUID2);
  expect(blocks[2][0]).toBe('ID: id-1700000000000-abc123');
  expect(blocks[3][0]).toBe('TYPE: Tools');
  expect(blocks[3]).toContain('DESCRIPTION: Odd one');
  expect(blocks[3].some((l) => l.startsWith('ID:'))).toBe(false);
  expect(blocks[3]).toContain('DATE_ADDED: 2025-01-10T09:00:00.000Z');
  expect(blocks[3]).toContain('STATUS: active');
});

test('round trip into an empty inventory preserves ids and content', async ({ page, browser }) => {
  await openApp(page, { inventory: INV });
  const text = await doExport(page);
  const ctx = await browser.newContext(CONTEXT_OPTIONS);
  const p2 = await ctx.newPage();
  const messages = watchDialogs(p2);
  await openApp(p2);
  await doImport(p2, text, messages);
  const { parsed } = await store(p2);
  expect(parsed.items).toHaveLength(3);
  expect(parsed.items.map((i) => i.id)).toEqual(INV.items.map((i) => i.id));
  expect(view(parsed)).toEqual(view(INV));
  await ctx.close();
});

test('importing own export into same inventory adds copies, originals untouched', async ({ page }) => {
  const messages = watchDialogs(page);
  await openApp(page, { inventory: INV });
  const text = await doExport(page);
  const before = (await store(page)).raw;
  await doImport(page, text, messages);
  const { parsed } = await store(page);
  expect(parsed.items).toHaveLength(6);
  const orig = JSON.parse(before).items;
  expect(JSON.stringify(parsed.items.slice(0, 3))).toBe(JSON.stringify(orig));
  const ids = parsed.items.map((i) => i.id);
  expect(new Set(ids).size).toBe(6);
  expect(view({ items: parsed.items.slice(3) })).toEqual(view(INV));
});

test('duplicate ID in one file: first keeps it, second gets a new id', async ({ page }) => {
  const messages = watchDialogs(page);
  await openApp(page);
  await doImport(page, 'ID: dup-1\nTYPE: A\nDESCRIPTION: one\n\nID: dup-1\nTYPE: A\nDESCRIPTION: two\n', messages);
  const { parsed } = await store(page);
  expect(parsed.items[0].id).toBe('dup-1');
  expect(parsed.items[1].id).not.toBe('dup-1');
  expect(parsed.items[1].id.length).toBeGreaterThan(0);
});

test('invalid IDs are replaced by generated ids and never injected', async ({ page }) => {
  const messages = watchDialogs(page);
  await openApp(page);
  const bad = ['<img src=x onerror=window.__xss=1>', 'x'.repeat(65), '', 'has space'];
  const text = bad.map((b, i) => 'ID: ' + b + '\nTYPE: T\nDESCRIPTION: item' + i).join('\n\n') + '\n';
  await doImport(page, text, messages);
  const { parsed } = await store(page);
  expect(parsed.items).toHaveLength(4);
  parsed.items.forEach((i) => expect(i.id).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/));
  expect(new Set(parsed.items.map((i) => i.id)).size).toBe(4);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await expect(page.locator('#currentList img')).toHaveCount(0);
  await expect(page.locator('#currentList')).toContainText('item0');
});

test('lower-case id key and CRLF line endings work', async ({ page }) => {
  const messages = watchDialogs(page);
  await openApp(page);
  await doImport(page, 'id: low-1\r\ntype: A\r\ndescription: one\r\n\r\nID: up-2\r\nTYPE: A\r\nDESCRIPTION: two\r\n', messages);
  const { parsed } = await store(page);
  expect(parsed.items.map((i) => i.id)).toEqual(['low-1', 'up-2']);
});

test('old-format file without IDs imports as before', async ({ page }) => {
  const messages = watchDialogs(page);
  await openApp(page);
  const old = [
    '# FlyStock Inventory Export',
    '# Exported: 2025-05-01T00:00:00.000Z',
    '# Current items: 1 | Removed items: 1',
    '# ---',
    '',
    'TYPE: Tools',
    'DESCRIPTION: Cordless drill',
    'COMMENT: first comment',
    'DATE_ADDED: 2025-01-10T09:00:00.000Z',
    'STATUS: active',
    'NOTE: 2025-03-01T10:00:00.000Z | later note',
    'COLOR: red',
    '',
    'TYPE: Parts',
    'DESCRIPTION: Old saw',
    'COMMENT: ',
    'DATE_ADDED: 2025-01-11T09:00:00.000Z',
    'STATUS: removed',
    'DATE_REMOVED: 2025-02-01T09:00:00.000Z',
    'REMOVAL_COMMENT: broke',
    '',
    'TYPE: Tools',
    'COMMENT: no description here',
    'DATE_ADDED: 2025-01-12T09:00:00.000Z',
    'STATUS: active',
    '',
  ].join('\r\n');
  const msg = await doImport(page, old, messages);
  expect(msg).toBe('Imported 2 items — added to your existing inventory (2 new types added). Skipped 1 unreadable entry.');
  const { parsed } = await store(page);
  expect(parsed.items).toHaveLength(2);
  const [a, b] = parsed.items;
  expect(a.id).toMatch(/\S/);
  expect(a.id).not.toBe(b.id);
  expect(view({ items: [a, b] })).toEqual([
    { type: 'Tools', description: 'Cordless drill', status: 'active', dateAdded: '2025-01-10T09:00:00.000Z', dateRemoved: null,
      notes: [{ date: '2025-01-10T09:00:00.000Z', text: 'first comment' }, { date: '2025-03-01T10:00:00.000Z', text: 'later note' }] },
    { type: 'Parts', description: 'Old saw', status: 'removed', dateAdded: '2025-01-11T09:00:00.000Z', dateRemoved: '2025-02-01T09:00:00.000Z',
      notes: [{ date: '2025-02-01T09:00:00.000Z', text: 'broke' }] },
  ]);
});

test('mixed file: blocks with and without ID', async ({ page }) => {
  const messages = watchDialogs(page);
  await openApp(page);
  await doImport(page, 'ID: keep-me\nTYPE: A\nDESCRIPTION: one\n\nTYPE: A\nDESCRIPTION: two\n', messages);
  const { parsed } = await store(page);
  expect(parsed.items[0].id).toBe('keep-me');
  expect(parsed.items[1].id).not.toBe('keep-me');
  expect(parsed.items[1].id).toMatch(/\S/);
});

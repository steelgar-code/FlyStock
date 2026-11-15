const { test, expect, CONTEXT_OPTIONS, openApp, store } = require('./support/app');

test.use(CONTEXT_OPTIONS);

const UUID_A = '3b1f2c3e-1111-4a5b-8c9d-0123456789ab';
const UUID_B = '4c2a3d4f-2222-4b6c-9d0e-123456789abc';

const SEED = JSON.stringify({
  types: ['Tools', 'Parts'],
  items: [
    { id: UUID_A, type: 'Tools', description: 'Drill', status: 'active', dateAdded: '2024-01-01T10:00:00.000Z', comment: 'legacy comment' },
    { type: 'Tools', description: 'No id item', status: 'active', dateAdded: '2024-01-02T10:00:00.000Z', notes: [{ id: 'k1', date: '2024-01-02T10:00:00.000Z', text: 'hi' }, { date: '2024-01-03T10:00:00.000Z', text: 'note without id' }] },
    { id: 'shared', type: 'Parts', description: 'Dup first', status: 'active', dateAdded: '2024-01-03T10:00:00.000Z', notes: [] },
    { id: 'shared', type: 'Parts', description: 'Dup second', status: 'active', dateAdded: '2024-01-04T10:00:00.000Z', notes: [] },
    { id: 42, type: 'Parts', description: 'Numeric id', status: 'active', dateAdded: '2024-01-05T10:00:00.000Z', notes: [] },
    { id: 'weird id!/x', type: 'Tools', description: 'Odd id', status: 'active', dateAdded: '2024-01-06T10:00:00.000Z', notes: [] },
    { id: UUID_B, type: 'Parts', description: 'Old saw', status: 'removed', dateAdded: '2024-01-07T10:00:00.000Z', dateRemoved: '2024-02-01T10:00:00.000Z', removalComment: 'snapped' },
  ],
});

test('loading legacy data renders everything and does not write', async ({ page }) => {
  await openApp(page, { inventory: SEED });
  await expect(page.locator('#statCurrent')).toHaveText('6');
  await expect(page.locator('#statRemoved')).toHaveText('1');
  for (const d of ['Drill', 'No id item', 'Dup first', 'Dup second', 'Numeric id', 'Odd id']) {
    await expect(page.locator('#currentList')).toContainText(d);
  }
  expect((await store(page)).raw).toBe(SEED);
});

test('after an ordinary save, data is repaired minimally and nothing is lost', async ({ page }) => {
  await openApp(page, { inventory: SEED });
  await page.locator('#btnAdd').click();
  await page.locator('#addTypeSelect').selectOption('Tools');
  await page.locator('#addDescription').fill('Spirit level');
  await page.locator('#addForm button[type="submit"]').click();
  await expect(page.locator('#currentList')).toContainText('Spirit level');

  const seed = JSON.parse(SEED);
  const { parsed } = await store(page);
  expect(parsed.items).toHaveLength(8);
  expect(parsed.types).toEqual(expect.arrayContaining(['Tools', 'Parts']));
  const ids = parsed.items.map((i) => i.id);
  ids.forEach((id) => { expect(typeof id).toBe('string'); expect(id).not.toBe(''); });
  expect(new Set(ids).size).toBe(ids.length);

  seed.items.forEach((s, idx) => {
    const got = parsed.items[idx];
    expect([got.type, got.description, got.status, got.dateAdded, got.dateRemoved || null])
      .toEqual([s.type, s.description, s.status, s.dateAdded, s.dateRemoved || null]);
    expect(got.comment).toBeUndefined();
    expect(got.removalComment).toBeUndefined();
  });
  // ids that were valid, non-empty and unique stay exactly as they were
  expect(ids[0]).toBe(UUID_A);
  expect(ids[2]).toBe('shared');
  expect(ids[5]).toBe('weird id!/x');
  expect(ids[6]).toBe(UUID_B);
  expect(ids[3]).not.toBe('shared');
  expect(typeof parsed.items[4].id).toBe('string');
  // legacy comments became notes
  expect(parsed.items[0].notes.map((n) => n.text)).toEqual(['legacy comment']);
  expect(parsed.items[6].notes.map((n) => n.text)).toEqual(['snapped']);
  // existing notes keep content; missing note id was filled
  expect(parsed.items[1].notes.map((n) => n.text)).toEqual(['hi', 'note without id']);
  expect(parsed.items[1].notes[0].id).toBe('k1');
  expect(parsed.items[1].notes[1].id).toMatch(/\S/);
});

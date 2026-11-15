const { test, expect, CONTEXT_OPTIONS, item, openApp, store } = require('./support/app');

test.use(CONTEXT_OPTIONS);

const INV = {
  types: ['Tools', 'Parts'],
  items: [
    item({ id: 'a1', type: 'Tools', description: 'Cordless drill' }),
    item({ id: 'a2', type: 'Parts', description: 'Spare belt' }),
    item({ id: 'r1', type: 'Tools', description: 'Old saw', status: 'removed' }),
  ],
};

const panel = (page, name) => page.locator('#' + name + 'Panel');
const notice = (page) => page.locator('#deepLinkNotice');

async function expectNoPanel(page) {
  for (const n of ['add', 'remove', 'edit', 'restore']) await expect(panel(page, n)).toBeHidden();
}
async function expectHashCleared(page) {
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('');
}

test('#edit= at load opens Edit with that item', async ({ page }) => {
  await openApp(page, { inventory: INV, hash: 'edit=a2' });
  await expect(panel(page, 'edit')).toBeVisible();
  await expect(page.locator('#editDescription')).toHaveValue('Spare belt');
  await expect(page.locator('#editRemovalFields')).toBeHidden();
});

test('#remove= at load opens Remove preset to the item', async ({ page }) => {
  await openApp(page, { inventory: INV, hash: 'remove=a2' });
  await expect(panel(page, 'remove')).toBeVisible();
  await expect(page.locator('#removeTypeSelect')).toHaveValue('Parts');
  await expect(page.locator('#removeItemSelect')).toHaveValue('a2');
});

test('#remove= on a removed item opens Edit with removal fields', async ({ page }) => {
  await openApp(page, { inventory: INV, hash: 'remove=r1' });
  await expect(panel(page, 'edit')).toBeVisible();
  await expect(panel(page, 'remove')).toBeHidden();
  await expect(page.locator('#editDescription')).toHaveValue('Old saw');
  await expect(page.locator('#editRemovalFields')).toBeVisible();
  await expect(page.locator('.tab[data-tab="removed"]')).toHaveClass(/active/);
});

test('#edit= on a removed item works', async ({ page }) => {
  await openApp(page, { inventory: INV, hash: 'edit=r1' });
  await expect(panel(page, 'edit')).toBeVisible();
  await expect(page.locator('#editDescription')).toHaveValue('Old saw');
  await expect(page.locator('#editRemovalFields')).toBeVisible();
});

test('hash is cleared after handling and reload opens no panel', async ({ page }) => {
  await openApp(page, { inventory: INV, hash: 'edit=a1' });
  await expect(panel(page, 'edit')).toBeVisible();
  await expectHashCleared(page);
  await page.reload();
  await expect(page.locator('#btnAdd')).toBeVisible();
  await expectNoPanel(page);
});

test('hashchange on an open page opens the panel', async ({ page }) => {
  await openApp(page, { inventory: INV });
  await page.evaluate(() => { location.hash = 'edit=a1'; });
  await expect(panel(page, 'edit')).toBeVisible();
  await expect(page.locator('#editDescription')).toHaveValue('Cordless drill');
  await expectHashCleared(page);
});

test('hashchange while another panel is open replaces it', async ({ page }) => {
  await openApp(page, { inventory: INV });
  await page.locator('#btnAdd').click();
  await expect(panel(page, 'add')).toBeVisible();
  await page.evaluate(() => { location.hash = 'remove=a1'; });
  await expect(panel(page, 'remove')).toBeVisible();
  await expect(page.locator('#removeItemSelect')).toHaveValue('a1');
  await page.waitForTimeout(400); // outlast the old panel's hide timer
  await expect(panel(page, 'remove')).toBeVisible();
  await expect(panel(page, 'add')).toBeHidden();

  await page.evaluate(() => { location.hash = 'edit=a2'; });
  await expect(panel(page, 'edit')).toBeVisible();
  await page.waitForTimeout(400);
  await expect(panel(page, 'edit')).toBeVisible();
  await expect(panel(page, 'remove')).toBeHidden();
  await expect(page.locator('#editDescription')).toHaveValue('Spare belt');
});

test('unknown id shows the notice and opens no panel', async ({ page }) => {
  await openApp(page, { inventory: INV, hash: 'edit=nope' });
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText('Item not found in this inventory');
  await expectNoPanel(page);
  await expectHashCleared(page);
  await notice(page).locator('button').click();
  await expect(notice(page)).toBeHidden();
});

test('notice is translated to Ukrainian', async ({ page }) => {
  await openApp(page, { inventory: INV, lang: 'uk', hash: 'remove=nope' });
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText('Елемент не знайдено в цьому інвентарі');
});

test('notice is translated to Portuguese', async ({ page }) => {
  await openApp(page, { inventory: INV, lang: 'pt-BR', hash: 'edit=nope' });
  await expect(notice(page)).toContainText('Item não encontrado neste inventário');
});

const BAD = [
  'edit=<img src=x onerror=window.__xss=1>',
  'edit=',
  'edit=' + 'a'.repeat(65),
  'delete=a1',
  'edit=a1&remove=a2',
  'edit=-a1',
  'edit=a1%20',
  'remove',
  'edit=a1/../x',
];
for (const h of BAD) {
  test('invalid link is ignored: #' + h.slice(0, 30), async ({ page }) => {
    await openApp(page, { inventory: INV, hash: h });
    await expect(page.locator('#btnAdd')).toBeVisible();
    await expectNoPanel(page);
    await expect(notice(page)).toBeHidden();
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expectHashCleared(page);
  });
}

test('a 64-char id is accepted', async ({ page }) => {
  const id = 'b'.repeat(64);
  const inv = { types: ['Tools'], items: [item({ id, description: 'Long id item' })] };
  await openApp(page, { inventory: inv, hash: 'edit=' + id });
  await expect(page.locator('#editDescription')).toHaveValue('Long id item');
});

test('invalid hash arriving later is ignored too', async ({ page }) => {
  await openApp(page, { inventory: INV });
  await page.evaluate(() => { location.hash = 'edit=<b>x</b>'; });
  await expectHashCleared(page);
  await expectNoPanel(page);
  await expect(notice(page)).toBeHidden();
});

test('opening a deep link does not write to storage', async ({ page }) => {
  await openApp(page, { inventory: INV });
  const before = (await store(page)).raw;
  await page.evaluate(() => { location.hash = 'edit=a1'; });
  await expect(panel(page, 'edit')).toBeVisible();
  await page.evaluate(() => { location.hash = 'remove=a2'; });
  await expect(panel(page, 'remove')).toBeVisible();
  await page.evaluate(() => { location.hash = 'edit=zzz'; });
  await expect(notice(page)).toBeVisible();
  expect((await store(page)).raw).toBe(before);
});

test.describe('storage error state', () => {
  test.use({ allowConsoleErrors: true });
  test('deep link does nothing beyond the error display', async ({ page }) => {
    await openApp(page, { inventory: '{bad', hash: 'edit=a1' });
    await expect(page.locator('#storageError')).toBeVisible();
    await expectNoPanel(page);
    await expect(notice(page)).toBeHidden();
  });
});

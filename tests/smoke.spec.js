const { test, expect, CONTEXT_OPTIONS, item, openApp, store } = require('./support/app');

test.use(CONTEXT_OPTIONS);

const INV = {
  types: ['Tools'],
  items: [
    item({ id: 'a1', description: 'Cordless drill' }),
    item({ id: 'r1', description: 'Old saw', status: 'removed' }),
  ],
};

test('loads with empty storage and no console errors', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#btnAdd')).toBeVisible();
  await expect(page.locator('#statCurrent')).toHaveText('0');
  await expect(page.locator('#storageError')).toBeHidden();
});

test('seeded items render in current and removed tabs', async ({ page }) => {
  await openApp(page, { inventory: INV });
  await expect(page.locator('#currentList')).toContainText('Cordless drill');
  await expect(page.locator('#currentList')).not.toContainText('Old saw');
  await page.locator('.tab[data-tab="removed"]').click();
  await expect(page.locator('#removedList')).toContainText('Old saw');
});

test('adding an item through the UI persists it', async ({ page }) => {
  await openApp(page, { inventory: INV });
  await page.locator('#btnAdd').click();
  await expect(page.locator('#addPanel')).toBeVisible();
  await page.locator('#addTypeSelect').selectOption('Tools');
  await page.locator('#addDescription').fill('Spirit level');
  await page.locator('#addForm button[type="submit"]').click();
  await expect(page.locator('#currentList')).toContainText('Spirit level');
  const { parsed } = await store(page);
  expect(parsed.items.map((i) => i.description)).toContain('Spirit level');
});

test.describe('unreadable storage', () => {
  test.use({ allowConsoleErrors: true });
  test('shows the storage error and does not overwrite the value', async ({ page }) => {
    const bad = '{not json';
    await openApp(page, { inventory: bad });
    await expect(page.locator('#storageError')).toBeVisible();
    expect((await store(page)).raw).toBe(bad);
  });
});

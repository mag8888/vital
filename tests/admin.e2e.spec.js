import { test, expect } from '@playwright/test';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const HAS_PASSWORD = !!ADMIN_PASSWORD && ADMIN_PASSWORD !== '__MISSING__';

async function login(page) {
  await page.goto('/admin/login');
  await expect(page.locator('form[action="/admin/login"]')).toBeVisible();
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();

  // Redirects either to /admin (success) or /admin/login?error=1 (bad password)
  await page.waitForURL(/\/admin(\/)?(\?|$)|\/admin\/login\?error=1/, { waitUntil: 'domcontentloaded' });
  const url = page.url();
  if (url.includes('/admin/login?error=1')) {
    throw new Error('ADMIN_PASSWORD неверный (получили /admin/login?error=1)');
  }

  await expect(page).toHaveURL(/\/admin(\/)?(\?|$)/);
  await expect(page.locator('.admin-shell')).toBeVisible();
}

function attachNoJsErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return {
    assertNone: async () => {
      // ignore noisy known cross-origin warnings; keep strict for SyntaxError/TypeError
      const bad = errors.filter((e) => /SyntaxError|TypeError|ReferenceError|Failed to execute|Uncaught/i.test(e));
      expect(bad, `JS errors in console:\n${bad.join('\n')}`).toEqual([]);
    },
  };
}

test.describe('Admin E2E (Senior QA)', () => {
  test.beforeEach(() => {
    test.skip(!HAS_PASSWORD, 'Set ADMIN_PASSWORD to run admin E2E safely.');
  });

  test('Dashboard: sidebar navigation works (Products / Categories)', async ({ page }) => {
    const js = attachNoJsErrors(page);
    await login(page);

    await expect(page.locator('.admin-shell')).toBeVisible();

    await page.locator('.admin-sidebar a.admin-nav-item[href="/admin/products"]').click();
    await expect(page).toHaveURL(/\/admin\/products/);
    await expect(page.locator('.admin-topbar h1')).toContainText(/Товары/i);

    await page.locator('.admin-sidebar a.admin-nav-item[href="/admin/categories"]').click();
    await expect(page).toHaveURL(/\/admin\/categories/);
    await expect(page.locator('.admin-topbar h1')).toContainText(/Категор/i);

    await js.assertNone();
  });

  test('Create product modal opens (no submit)', async ({ page }) => {
    const js = attachNoJsErrors(page);
    await login(page);
    // open modal
    const addBtn = page.getByRole('button', { name: /Добавить товар/i });
    if (await addBtn.count()) {
      await addBtn.click();
    } else {
      // fallback: use existing global function if dashboard UI differs
      await page.evaluate(() => {
        try {
          if (typeof window.openAddProductModal === 'function') window.openAddProductModal();
        } catch (_) {}
      });
    }
    await expect(page.locator('#addProductModal')).toBeVisible();
    // close modal
    await page.locator('#addProductModal .close').click();
    await expect(page.locator('#addProductModal')).toBeHidden();
    await js.assertNone();
  });

  test('Content links: Products page loads and UI works (filter/search/table/modal) without mutations', async ({ page }) => {
    const js = attachNoJsErrors(page);
    await login(page);

    // Go to products from sidebar
    await page.locator('.admin-sidebar a.admin-nav-item[href="/admin/products"]').click();
    await expect(page).toHaveURL(/\/admin\/products/);
    await expect(page.locator('.admin-shell')).toBeVisible();
    await expect(page.locator('.admin-topbar h1')).toContainText(/Товары/i);

    // Basic UI
    const viewTableBtn = page.locator('#viewTableBtn');
    await expect(viewTableBtn).toBeVisible();

    // Switch to table view
    await viewTableBtn.click();
    await expect(page.locator('#productsTableContainer')).toBeVisible();
    await expect(page.locator('#productsCardsContainer')).toBeHidden();

    // Open image preview modal (if there is at least one thumb)
    const firstThumb = page.locator('.table-thumb').first();
    const thumbCount = await firstThumb.count();
    if (thumbCount > 0) {
      await firstThumb.click();
      await expect(page.locator('#tableImageModal')).toBeVisible();
      await page.locator('#tableImageModal button.close-btn').click();
      await expect(page.locator('#tableImageModal')).toBeHidden();
    }

    // Search should not throw; type something common then clear
    const search = page.locator('#adminProductsSearch');
    await expect(search).toBeVisible();
    await search.fill('siam');
    await search.fill('');

    // Filter buttons: click "Все категории" first, then if any category exists click it
    const allBtn = page.locator('.filter-btn[data-filter="all"]').first();
    await allBtn.click();
    const anyCat = page.locator('.filter-btn[data-filter]:not([data-filter="all"])').first();
    if (await anyCat.count()) await anyCat.click();

    // Edit modal should open if there is any product (prefer cards view for stable click targets)
    const viewCardsBtn = page.locator('#viewCardsBtn');
    if (await viewCardsBtn.count()) {
      await viewCardsBtn.click();
      await expect(page.locator('#productsCardsContainer')).toBeVisible();
    }

    let editBtn = page.locator('#productsCardsContainer .edit-btn:visible').first();
    if (!(await editBtn.count())) {
      // fallback to table
      await viewTableBtn.click();
      await expect(page.locator('#productsTableContainer')).toBeVisible();
      editBtn = page.locator('#productsTableContainer .edit-btn').first();
    }

    if (await editBtn.count()) {
      await editBtn.scrollIntoViewIfNeeded();
      await editBtn.click({ force: true });
      await expect(page.locator('#editProductModal')).toBeVisible();
      // close without saving
      await page.locator('#editProductModal .close-btn').click({ force: true });
      // safety: if a delayed "force show" timer existed, closing should still win
      await page.waitForTimeout(100);
      await expect(page.locator('#editProductModal')).toBeHidden();
    }

    await js.assertNone();
  });

  test('Content links: Categories / Reviews / Orders pages are accessible', async ({ page }) => {
    const js = attachNoJsErrors(page);
    await login(page);

    await page.locator('.admin-sidebar a.admin-nav-item[href="/admin/categories"]').click();
    await expect(page).toHaveURL(/\/admin\/categories/);
    await expect(page.locator('.admin-shell')).toBeVisible();
    await expect(page.locator('.admin-topbar h1')).toContainText(/Категор/i);

    await page.locator('.admin-sidebar a.admin-nav-item[href="/admin/reviews"]').click();
    await expect(page).toHaveURL(/\/admin\/reviews/);
    await expect(page.locator('.admin-topbar h1')).toContainText(/Отзыв/i);

    await page.locator('.admin-sidebar a.admin-nav-item[href="/admin/orders"]').click();
    await expect(page).toHaveURL(/\/admin\/orders/);
    await expect(page.locator('.admin-topbar h1')).toContainText(/Заказ/i);

    await js.assertNone();
  });
});


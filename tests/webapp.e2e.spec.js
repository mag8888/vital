import { test, expect } from '@playwright/test';

function makeTelegramUser(id) {
  return {
    id,
    first_name: 'E2E',
    last_name: 'User',
    username: `e2e_user_${id}`,
    language_code: 'ru',
  };
}

test.describe('WebApp E2E (Senior QA)', () => {
  test.beforeEach(async ({ context }) => {
    // Use an isolated user per test to avoid polluting a shared mock user.
    const id = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10_000);
    await context.setExtraHTTPHeaders({
      'X-Telegram-User': JSON.stringify(makeTelegramUser(id)),
    });
  });

  test('Bottom nav: main pages keep bottom nav visible; internal pages show back arrow and hide bottom nav', async ({ page }) => {
    await page.goto('/webapp/');

    const bottomNav = page.locator('nav.bottom-nav');
    await expect(bottomNav).toBeVisible();

    // Open About (main page)
    await page.locator('nav.bottom-nav .nav-item', { hasText: 'О нас' }).click();
    const overlay = page.locator('#section-overlay');
    await expect(overlay).toHaveClass(/open/);
    await expect(bottomNav).toBeVisible();

    // Back button should be hidden on main pages (except partner)
    const backBtn = overlay.locator('.section-header .back-btn');
    await expect(backBtn).toBeHidden();

    // Title should be centered: compare center X vs header center X (within tolerance)
    const header = overlay.locator('.section-header');
    const title = overlay.locator('#section-title');
    const hb = await header.boundingBox();
    const tb = await title.boundingBox();
    expect(hb).toBeTruthy();
    expect(tb).toBeTruthy();
    const headerCenterX = hb.x + hb.width / 2;
    const titleCenterX = tb.x + tb.width / 2;
    expect(Math.abs(headerCenterX - titleCenterX)).toBeLessThanOrEqual(10);

    // Open Certificates (internal page) via side menu -> should show back arrow
    await page.locator('#menu-drawer').evaluate((el) => el.classList.remove('hidden'));
    await page.locator('#menu-drawer').evaluate((el) => el.classList.add('open'));
    await page.locator('#menu-drawer .menu-item', { hasText: 'Сертификаты' }).click();

    await expect(overlay).toHaveClass(/open/);
    await expect(backBtn).toBeVisible();
    await expect(overlay).not.toHaveClass(/main-section/);
  });

  test('Partner: bottom nav visible AND back arrow visible', async ({ page }) => {
    await page.goto('/webapp/');
    const bottomNav = page.locator('nav.bottom-nav');
    await expect(bottomNav).toBeVisible();

    await page.locator('nav.bottom-nav .nav-item', { hasText: 'Амбассадоры' }).click();
    const overlay = page.locator('#section-overlay');
    await expect(overlay).toHaveClass(/open/);
    await expect(bottomNav).toBeVisible();
    await expect(overlay.locator('.section-header .back-btn')).toBeVisible();
  });

  test('Favorites: card footer layout (button under price and centered)', async ({ page }) => {
    await page.goto('/webapp/');

    // Wait until products load at least one product card (home uses mostly horizontal cards)
    const anyCard = page.locator('.product-card-forma, .product-card-forma-horizontal').first();
    await expect(anyCard).toBeVisible({ timeout: 20_000 });

    // Toggle favorite on the first product
    const favBtn = anyCard.locator('.favorite-btn');
    await expect(favBtn).toBeVisible();
    await favBtn.click();

    // Open favorites
    await page.locator('nav.bottom-nav .nav-item', { hasText: 'Избранное' }).click();
    const overlay = page.locator('#section-overlay');
    await expect(overlay).toHaveClass(/open/);

    const favGrid = overlay.locator('.favorites-products-grid');
    await expect(favGrid).toBeVisible();

    const card = favGrid.locator('.product-card-forma').first();
    await expect(card).toBeVisible();

    const price = card.locator('.product-card-price');
    const btn = card.locator('.product-card-btn');
    await expect(price).toBeVisible();
    await expect(btn).toBeVisible();

    const pb = await price.boundingBox();
    const bb = await btn.boundingBox();
    const cb = await card.boundingBox();
    expect(pb && bb && cb).toBeTruthy();

    // Button should be under price
    expect(bb.y).toBeGreaterThan(pb.y + pb.height - 1);

    // Button centered within card (tolerance)
    const cardCenterX = cb.x + cb.width / 2;
    const btnCenterX = bb.x + bb.width / 2;
    expect(Math.abs(cardCenterX - btnCenterX)).toBeLessThanOrEqual(18);
  });
});


import { test, expect, waitForResultsScreen } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/session/match');
  await page.locator('#grid').waitFor();
});

test('loads 10 cards, none flipped initially', async ({ page }) => {
  // With 9 test words → 5-word session → 5 pairs = 10 cards
  await expect(page.locator('.card-wrap[data-id]')).toHaveCount(10, { timeout: 5000 });
  await expect(page.locator('.card-wrap.flipped')).toHaveCount(0);
});

test('clicking a card flips it face-up', async ({ page }) => {
  const firstCard = page.locator('.card-wrap[data-id]').first();
  const dataId = await firstCard.getAttribute('data-id');
  await firstCard.click();
  await expect(page.locator(`[data-id="${dataId}"]`)).toHaveClass(/flipped/);
});

test('clicking a matching pair marks both as matched', async ({ page }) => {
  // Find first en-card, get its wordId, then click both sides
  const enCard = page.locator('.card-wrap[data-id^="en-"]').first();
  const enId = await enCard.getAttribute('data-id') ?? '';
  const wordId = enId.replace('en-', '');

  await page.locator(`[data-id="${enId}"]`).click();
  await page.locator(`[data-id="hu-${wordId}"]`).click();
  await expect(page.locator('.card-wrap.matched')).toHaveCount(2, { timeout: 2000 });
});

test('non-matching pair unflips', async ({ page }) => {
  // Click two different en-cards
  const enCards = page.locator('.card-wrap[data-id^="en-"]');
  await enCards.nth(0).click();
  await enCards.nth(1).click();
  // After 900ms timeout, both flip back
  await expect(page.locator('.card-wrap.flipped')).toHaveCount(0, { timeout: 2500 });
});

test('matching all 5 pairs completes the round and shows results', async ({ page }) => {
  // Match all 5 pairs dynamically
  const totalPairs = 5;
  for (let i = 0; i < totalPairs; i++) {
    // Find first unmatched en-card
    const enCard = page.locator('.card-wrap[data-id^="en-"]:not(.matched)').first();
    const enId = await enCard.getAttribute('data-id') ?? '';
    const wordId = enId.replace('en-', '');

    await page.locator(`[data-id="${enId}"]`).click();
    await page.locator(`[data-id="hu-${wordId}"]`).click();
    // Verify matched count grows (but not on last iteration, as results may appear)
    if (i < totalPairs - 1) {
      await expect(page.locator('.card-wrap.matched')).toHaveCount((i + 1) * 2, { timeout: 2000 });
    }
  }

  // After all pairs matched, results should appear
  await waitForResultsScreen(page);
});

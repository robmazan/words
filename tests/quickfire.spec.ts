import { test, expect, answerCurrentWord, waitForAdvance, SESSION_WORD_COUNT } from './fixtures.js';

test('timer is visible and near 30 on load', async ({ page }) => {
  await page.goto('/session/quickfire');
  await page.locator('#timer').waitFor();
  await expect(page.locator('#timer')).toHaveText(/^(29|30)$/);
});

test('regression #3: game does not freeze after submitting 2 answers', async ({ page }) => {
  await page.goto('/session/quickfire');
  await page.locator('#timer').waitFor();

  // Answer 2 words to verify game progresses without freezing
  for (let i = 0; i < 2; i++) {
    const prev = (await page.locator('.prompt').textContent() ?? '').trim();
    await answerCurrentWord(page, 'quickfire');
    await waitForAdvance(page, prev, '.prompt');
    await expect(page.locator('#answer')).toHaveValue('');
  }

  // Game still alive: timer and prompt present, no crash
  await expect(page.locator('#timer')).toBeVisible();
  await expect(page.locator('.prompt')).toBeVisible();
});

test('skip advances without incrementing streak', async ({ page }) => {
  await page.goto('/session/quickfire');
  await page.locator('#timer').waitFor();

  // Answer one correctly to get streak to 1
  const prev1 = (await page.locator('.prompt').textContent() ?? '').trim();
  await answerCurrentWord(page, 'quickfire');
  await waitForAdvance(page, prev1, '.prompt');
  await expect(page.locator('.streak')).toContainText('×1');

  // Now skip — streak resets to 0
  const prev2 = (await page.locator('.prompt').textContent() ?? '').trim();
  await page.locator('.skip-btn').click();
  await waitForAdvance(page, prev2, '.prompt');
  await expect(page.locator('.streak')).toContainText('×0');
});

test('session completes after all words answered', async ({ page }) => {
  await page.goto('/session/quickfire');
  await page.locator('#timer').waitFor();

  // Answer all 5 session words
  for (let i = 0; i < SESSION_WORD_COUNT; i++) {
    const prev = (await page.locator('.prompt').textContent() ?? '').trim();
    await answerCurrentWord(page, 'quickfire');
    if (i < SESSION_WORD_COUNT - 1) {
      await waitForAdvance(page, prev, '.prompt');
    }
  }

  // Verify results screen appears
  await page.locator('.score-val.correct').waitFor({ timeout: 10000 });
});


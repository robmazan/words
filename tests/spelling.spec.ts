import { test, expect, answerCurrentWord, waitForAdvance, TEST_WORDS } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/session/spelling');
  await page.locator('.hungarian-hint').waitFor();
});

test('regression #1: input is empty when next word appears', async ({ page }) => {
  const prev = (await page.locator('.hungarian-hint').textContent() ?? '').trim();
  await answerCurrentWord(page, 'spelling');
  await waitForAdvance(page, prev, '.hungarian-hint');
  await expect(page.locator('#answer')).toHaveValue('');
});

test('correct spelling shows correct feedback', async ({ page }) => {
  await answerCurrentWord(page, 'spelling');
  await expect(page.locator('.correct-fb')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#answer')).toHaveClass(/correct/);
});

test('wrong spelling shows feedback with correct word', async ({ page }) => {
  const hint = await page.locator('.hungarian-hint').textContent() ?? '';
  const hungarian = hint.replace(/^\S+\s+/, '').trim();

  await page.locator('#answer').fill('WRONG_SPELLING');
  await page.locator('#answer').press('Enter');

  await expect(page.locator('.wrong-fb')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('.wrong-fb strong')).not.toBeEmpty();
  const word = TEST_WORDS.find(w => w.hungarian === hungarian);
  if (word) {
    await expect(page.locator('.wrong-fb strong')).toHaveText(word.english);
  }
});

test('hungarian hint displays a known word', async ({ page }) => {
  const hint = await page.locator('.hungarian-hint').textContent() ?? '';
  const hungarian = hint.replace(/^\S+\s+/, '').trim();
  const match = TEST_WORDS.find(w => w.hungarian === hungarian);
  expect(match).toBeDefined();
});

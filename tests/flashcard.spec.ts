import { test, expect, answerCurrentWord, waitForAdvance, waitForResultsScreen, SESSION_WORD_COUNT, TEST_WORDS } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/session/flashcard');
  await page.locator('.direction-label').waitFor();
});

test('regression #1: input is empty when next word appears', async ({ page }) => {
  const prev = (await page.locator('.card .prompt').textContent() ?? '').trim();
  await answerCurrentWord(page, 'flashcard');
  await waitForAdvance(page, prev, '.card .prompt');
  await expect(page.locator('#answer')).toHaveValue('');
});

test('correct answer shows correct feedback', async ({ page }) => {
  await answerCurrentWord(page, 'flashcard');
  await expect(page.locator('.correct-fb')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('#answer')).toHaveClass(/correct/);
});

test('wrong answer shows wrong feedback with correct answer', async ({ page }) => {
  const label = await page.locator('.direction-label').textContent() ?? '';
  const prompt = (await page.locator('.card .prompt').textContent() ?? '').trim();
  const isHuToEn = label.trim().startsWith('Hungarian');
  const word = TEST_WORDS.find(w => isHuToEn ? w.hungarian === prompt : w.english === prompt);
  const correctAnswer = isHuToEn ? word?.english : word?.hungarian;

  await page.locator('#answer').fill('WRONG_ANSWER');
  await page.locator('#answer').press('Enter');

  await expect(page.locator('.wrong-fb')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('#answer')).toHaveClass(/wrong/);
  if (correctAnswer) {
    await expect(page.locator('.wrong-fb')).toContainText(correctAnswer);
  }
});

test('regression #2: word 2 answer evaluated against word 2, not word 1', async ({ page }) => {
  // Answer word 1 incorrectly to advance
  const prompt1 = (await page.locator('.card .prompt').textContent() ?? '').trim();
  await page.locator('#answer').fill('WRONG_ANSWER');
  await page.locator('#answer').press('Enter');

  // Wait for word 2 to appear
  await waitForAdvance(page, prompt1, '.card .prompt');

  // Answer word 2 correctly
  await answerCurrentWord(page, 'flashcard');

  // The stale closure bug would evaluate word 2's answer against word 1's data,
  // causing a correct answer for word 2 to appear wrong. Assert correct feedback.
  await expect(page.locator('.correct-fb')).toBeVisible({ timeout: 2000 });
});

test('session completes and shows results screen', async ({ page }) => {
  for (let i = 0; i < SESSION_WORD_COUNT; i++) {
    const prev = (await page.locator('.card .prompt').textContent() ?? '').trim();
    await answerCurrentWord(page, 'flashcard');
    if (i < SESSION_WORD_COUNT - 1) {
      await waitForAdvance(page, prev, '.card .prompt');
    }
  }
  await waitForResultsScreen(page);
  await expect(page.locator('.score-val.correct')).toHaveText('5');
  await expect(page.locator('.score-val.wrong')).toHaveText('0');
});

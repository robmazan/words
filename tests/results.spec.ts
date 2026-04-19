import { test, expect, answerCurrentWord, waitForAdvance, waitForResultsScreen, SESSION_WORD_COUNT, TEST_WORDS } from './fixtures.js';

async function completeFlashcard(
  page: Parameters<typeof answerCurrentWord>[0],
  wrongOnIndex?: number,
): Promise<void> {
  await page.goto('/session/flashcard');
  await page.locator('.direction-label').waitFor();

  for (let i = 0; i < SESSION_WORD_COUNT; i++) {
    const prev = (await page.locator('.card .prompt').textContent() ?? '').trim();
    if (i === wrongOnIndex) {
      await page.locator('#answer').fill('WRONG_ANSWER');
      await page.locator('#answer').press('Enter');
    } else {
      await answerCurrentWord(page, 'flashcard');
    }
    if (i < SESSION_WORD_COUNT - 1) {
      await waitForAdvance(page, prev, '.card .prompt');
    }
  }

  await waitForResultsScreen(page);
}

test('all-correct session shows correct counts', async ({ page }) => {
  await completeFlashcard(page);
  await expect(page.locator('.score-val.correct')).toHaveText('5');
  await expect(page.locator('.score-val.wrong')).toHaveText('0');
});

test('mixed session shows correct counts', async ({ page }) => {
  // Make the first answer wrong (index 0)
  await completeFlashcard(page, 0);
  await expect(page.locator('.score-val.correct')).toHaveText('4');
  await expect(page.locator('.score-val.wrong')).toHaveText('1');
});

test('Play Again button returns to home', async ({ page }) => {
  await completeFlashcard(page);
  await page.locator('.btn-primary').click();
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.locator('.mode-btn')).toHaveCount(4);
});

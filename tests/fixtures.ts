import { test as base, expect, type Page } from '@playwright/test';

export { expect };

// 9 words → selectSessionWords yields exactly 5 (Math.min loop exits at pool.length < i)
export const TEST_WORDS = [
  { id: 'w1', english: 'apple',    hungarian: 'alma',    exampleSentence: '', dateAdded: '2024-01-01', index: 0 },
  { id: 'w2', english: 'boy',      hungarian: 'fiú',     exampleSentence: '', dateAdded: '2024-01-01', index: 1 },
  { id: 'w3', english: 'cat',      hungarian: 'macska',  exampleSentence: '', dateAdded: '2024-01-01', index: 2 },
  { id: 'w4', english: 'dog',      hungarian: 'kutya',   exampleSentence: '', dateAdded: '2024-01-01', index: 3 },
  { id: 'w5', english: 'elephant', hungarian: 'elefánt', exampleSentence: '', dateAdded: '2024-01-01', index: 4 },
  { id: 'w6', english: 'fish',     hungarian: 'hal',     exampleSentence: '', dateAdded: '2024-01-01', index: 5 },
  { id: 'w7', english: 'girl',     hungarian: 'lány',    exampleSentence: '', dateAdded: '2024-01-01', index: 6 },
  { id: 'w8', english: 'house',    hungarian: 'ház',     exampleSentence: '', dateAdded: '2024-01-01', index: 7 },
  { id: 'w9', english: 'ice',      hungarian: 'jég',     exampleSentence: '', dateAdded: '2024-01-01', index: 8 },
];

// Session size with 9 words: Math.min(25, pool_size) where pool_size shrinks each iteration
// exits when i >= current pool.length: stops at i=5 → 5 words selected
export const SESSION_WORD_COUNT = 5;

const MOCK_PROFILE = {
  userId: 'u1', xp: 0, level: 1, streak: 0,
  lastLoginDate: new Date().toISOString().split('T')[0], badges: [],
};

export async function setupMocks(page: Page): Promise<void> {
  await page.route('**/.auth/me', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      clientPrincipal: {
        userId: 'u1', userDetails: 'tester',
        identityProvider: 'aad', userRoles: ['authenticated'],
      },
    }),
  }));

  await page.route('**/api/words', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(TEST_WORDS),
  }));

  await page.route('**/api/progress', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/api/profile', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PROFILE),
      });
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ...MOCK_PROFILE, xp: 50, streak: 1 }),
    });
  });
}

export const test = base.extend<{ mockApis: void }>({
  mockApis: [async ({ page }, use) => {
    await setupMocks(page);
    await use();
  }, { auto: true }],
});

export async function answerCurrentWord(
  page: Page,
  gameType: 'flashcard' | 'quickfire' | 'spelling' = 'flashcard',
): Promise<string> {
  if (gameType === 'spelling') {
    const hint = await page.locator('.hungarian-hint').textContent() ?? '';
    const hungarian = hint.replace(/^\S+\s+/, '').trim();
    const word = TEST_WORDS.find(w => w.hungarian === hungarian);
    const answer = word?.english ?? '';
    await page.locator('#answer').fill(answer);
    await page.locator('#answer').press('Enter');
    return answer;
  }

  const label = await page.locator('.direction-label').textContent() ?? '';
  const prompt = await page.locator('.prompt').textContent() ?? '';
  // Note: "English → Hungarian" also contains "Hungarian" — check startsWith instead
  const isHuToEn = label.trim().startsWith('Hungarian');
  const word = TEST_WORDS.find(w =>
    isHuToEn ? w.hungarian === prompt.trim() : w.english === prompt.trim(),
  );
  const answer = isHuToEn ? (word?.english ?? '') : (word?.hungarian ?? '');
  await page.locator('#answer').fill(answer);
  await page.locator('#answer').press('Enter');
  return answer;
}

// Polls until the prompt changes OR results screen appears. Avoids `not.toHaveText`
// which errors when the element disappears (e.g., game navigates to results).
export async function waitForAdvance(
  page: Page,
  prev: string,
  promptSel: string,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await page.locator('.score-val.correct').isVisible()) return;
    const curr = await page.locator(promptSel).textContent({ timeout: 500 }).catch(() => null);
    if (curr === null || curr.trim() !== prev.trim()) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for game to advance from "${prev}"`);
}

export async function waitForResultsScreen(page: Page): Promise<void> {
  await page.locator('.score-val.correct').waitFor({ timeout: 20000 });
}

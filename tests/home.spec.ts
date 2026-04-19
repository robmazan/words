import { test, expect } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.mode-btn').first().waitFor();
});

test('shows all 4 game mode buttons', async ({ page }) => {
  await expect(page.locator('.mode-btn')).toHaveCount(4);
  await expect(page.getByText('Flash Cards')).toBeVisible();
  await expect(page.getByText('Spelling Bee')).toBeVisible();
  await expect(page.getByText('Match Game')).toBeVisible();
  await expect(page.getByText('Quick Fire')).toBeVisible();
});

test('Flash Cards button navigates to flashcard game', async ({ page }) => {
  await page.getByText('Flash Cards').click();
  await expect(page).toHaveURL(/\/session\/flashcard/);
  await expect(page.locator('.direction-label')).toBeVisible();
});

test('Spelling Bee button navigates to spelling game', async ({ page }) => {
  await page.getByText('Spelling Bee').click();
  await expect(page).toHaveURL(/\/session\/spelling/);
  await expect(page.locator('.hungarian-hint')).toBeVisible();
});

test('Match Game button navigates to match game', async ({ page }) => {
  await page.getByText('Match Game').click();
  await expect(page).toHaveURL(/\/session\/match/);
  await expect(page.locator('#grid')).toBeVisible();
});

test('Quick Fire button navigates to quickfire game', async ({ page }) => {
  await page.getByText('Quick Fire').click();
  await expect(page).toHaveURL(/\/session\/quickfire/);
  await expect(page.locator('#timer')).toBeVisible();
});

test('Zoo link navigates to zoo', async ({ page }) => {
  await page.locator('.zoo-link').click();
  await expect(page).toHaveURL(/\/zoo/);
});

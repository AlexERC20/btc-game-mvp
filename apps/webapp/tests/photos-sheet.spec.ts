import { test, expect } from '@playwright/test';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Q4n1b8AAAAASUVORK5CYII=',
  'base64'
);

test('upload, reorder and remove photos', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('text=Photos');

  await page.setInputFiles('input[type=file]', [
    { name: '1.png', mimeType: 'image/png', buffer: png },
    { name: '2.png', mimeType: 'image/png', buffer: png },
    { name: '3.png', mimeType: 'image/png', buffer: png },
  ]);

  await expect(page.locator('.thumb')).toHaveCount(3);

  await page.locator('.thumb').nth(2).locator('button[aria-label="Переместить влево"]').click();
  const alts = await page.locator('.thumb img').allAttribute('alt');
  expect(alts).toEqual(['1.png', '3.png', '2.png']);

  await page.locator('.thumb').nth(1).locator('button[aria-label="Удалить"]').click();
  await expect(page.locator('.thumb')).toHaveCount(2);

  await expect(page.locator('.thumb').first().locator('button[aria-label="Переместить влево"]').first()).toBeDisabled();
  await expect(page.locator('.thumb').last().locator('button[aria-label="Переместить вправо"]').first()).toBeDisabled();
});


import { test, expect } from '@playwright/test';

test.describe('File List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display file list page', async ({ page }) => {
    await expect(page.getByText('文件列表')).toBeVisible();
    await expect(page.getByText('CSV文件导入')).toBeVisible();
    await expect(page.getByText('FCS文件导入')).toBeVisible();
  });

  test('should open upload modal', async ({ page }) => {
    await page.getByText('CSV文件导入').click();
    await expect(page.getByText('确认上传')).toBeVisible();
  });

  test('should open FCS integration modal', async ({ page }) => {
    await page.getByText('FCS文件导入').click();
    await expect(page.getByText('开始整合')).toBeVisible();
  });

  test('should close upload modal', async ({ page }) => {
    await page.getByText('CSV文件导入').click();
    await expect(page.getByText('确认上传')).toBeVisible();

    // Click close button or backdrop
    await page.keyboard.press('Escape');
    await expect(page.getByText('确认上传')).not.toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('文件列表')).toBeVisible();

    // Test navigation if available
    const navLinks = await page.locator('nav a').all();
    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      if (href && href !== '/') {
        await link.click();
        await expect(page).toHaveURL(new RegExp(href.replace('/', '\\/')));
        await page.goto('/');
      }
    }
  });
});

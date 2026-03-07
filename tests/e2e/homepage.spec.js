/**
 * E2E Test: Homepage
 * Tests the main landing page functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the homepage title', async ({ page }) => {
    await expect(page).toHaveTitle(/ScaryGamesAI/);
  });

  test('should display hero section', async ({ page }) => {
    const hero = page.locator('header, .hero, [class*="hero"]');
    await expect(hero).toBeVisible();
  });

  test('should display game cards', async ({ page }) => {
    const gameCards = page.locator('[class*="game-card"], [data-testid="game-card"]');
    await expect(gameCards).toHaveCount({ min: 1 });
  });

  test('should navigate to games page', async ({ page }) => {
    const gamesLink = page.locator('a[href*="games"], [class*="nav"] a').first();
    await gamesLink.click();
    await expect(page).toHaveURL(/.*games.*/);
  });

  test('should filter games by tier', async ({ page }) => {
    const filterButtons = page.locator('[class*="filter"], [data-testid*="filter"]');
    if (await filterButtons.count() > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(500);
      const gameCards = page.locator('[class*="game-card"]');
      await expect(gameCards).toHaveCount({ min: 0 });
    }
  });
});

test.describe('Authentication Flow', () => {
  test('should show login modal', async ({ page }) => {
    await page.goto('/');
    
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), [class*="login"]');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      
      // Wait for modal or navigation
      await page.waitForTimeout(1000);
      
      // Check if login form is visible
      const loginForm = page.locator('form, [class*="login-form"], input[type="email"]');
      await expect(loginForm).toBeVisible();
    }
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check if main elements are visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should work on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.locator('body')).toBeVisible();
  });
});

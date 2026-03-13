import { test, expect } from '@playwright/test';

const testUser = {
  displayName: 'Tester',
  email: `test-${Date.now()}@example.com`,
  password: 'password1234',
};

test.describe('Authentication', () => {
  test.beforeEach(async ({ context }) => {
    // Start with a clean slate
    await context.clearCookies();
  });

  test('Signup, Logout, and Login flow', async ({ page }) => {
    // 1. Signup
    await page.goto('/auth');
    await page.getByRole('tab', { name: '회원가입' }).click();
    await page.locator('input[name="displayName"]').fill(testUser.displayName);
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('button[type="submit"]').click();

    // Expect to be redirected to dashboard
    // Using a longer timeout as it might involve some bootstrap loading
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    
    // 2. Logout
    await page.goto('/settings');
    await page.getByRole('button', { name: '로그아웃' }).click();
    
    // Expect to be redirected to auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });

    // Handle potential "Login expired" alert or just wait for the form
    await page.waitForSelector('button[type="submit"]:has-text("로그인")');

    // 3. Login
    // Ensure we are on the login tab (it's the default but let's be sure)
    await page.getByRole('tab', { name: '로그인' }).click();
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('button[type="submit"]').click();

    // Expect to be redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('Login failure with wrong password', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: '로그인' }).click();
    await page.locator('input[name="email"]').fill('wrong@example.com');
    await page.locator('input[name="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Expect error message
    // Note: If 403 CSRF happens, it might show a different message.
    // But we expect the logic to work.
    await expect(page.locator('text=/이메일 또는 비밀번호|요청을 처리하지 못했어요/')).toBeVisible();
  });

  test('Protected route redirect', async ({ page }) => {
    await page.goto('/dashboard');
    // Expect to be redirected to auth if not logged in
    await expect(page).toHaveURL(/\/auth/);
  });
});

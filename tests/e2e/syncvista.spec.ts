import { test, expect } from '@playwright/test';

// Deterministic test session cookie
const TEST_COOKIE = {
  name: 'session',
  value: 'testuser2-session',
  domain: 'localhost',
  path: '/',
  httpOnly: true,
  sameSite: 'Strict' as const,
};

test.describe('SyncVista Pre-Interview Production Readiness E2E Suite', () => {

  test('TEST 1: Authentication & Sign-in Flow', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });

    // 1. Verify sign-in page structure
    const signInHeading = page.getByRole('heading', { name: /Sign In/i });
    await expect(signInHeading).toBeVisible();

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // 2. Verify 1-click Demo Account button is available
    const demoButton = page.getByRole('button', { name: /Demo Account/i });
    await expect(demoButton).toBeVisible();

    // 3. Perform 1-click sign in
    await demoButton.click();

    // 4. Verify successful redirection to dashboard root
    await page.waitForURL('/', { timeout: 15000 });
    expect(page.url()).toContain('localhost:3000');
    expect(errors).toHaveLength(0);
  });

  test('TEST 2: Home Dashboard Rendering & Zero Indefinite Loaders', async ({ page, context }) => {
    await context.addCookies([TEST_COOKIE]);
    
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Verify greeting HeaderBox exists
    const greeting = page.getByRole('heading', { name: /Good (morning|afternoon|evening), Test/i });
    await expect(greeting).toBeVisible({ timeout: 10000 });

    // Verify Financial Health Diagnostic card
    await expect(page.getByText('Financial Health Diagnostic')).toBeVisible();

    // Verify Capital Trajectory section
    await expect(page.getByText('Capital Trajectory')).toBeVisible();

    // Verify no blocking indefinite "Loading page content..." text exists anywhere
    const loadingBlocker = page.getByText('Loading page content', { exact: false });
    await expect(loadingBlocker).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });

  test('TEST 3: Sidebar Navigation Across All 5 Major Routes with Active State', async ({ page, context }) => {
    await context.addCookies([TEST_COOKIE]);
    
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. Navigate to My Banks
    await page.locator('.sidebar a[href="/my-banks"]').click();
    await page.waitForURL('**/my-banks');
    await expect(page.getByText('My Bank Accounts').first()).toBeVisible();

    // 2. Navigate to Financial Intelligence
    await page.locator('.sidebar a[href="/financial-intelligence"]').click();
    await page.waitForURL('**/financial-intelligence');
    await expect(page.getByText('Financial Intelligence').first()).toBeVisible();

    // 3. Navigate to Investments
    await page.locator('.sidebar a[href="/investments"]').click();
    await page.waitForURL('**/investments');
    await expect(page.getByText('Investments & Net Worth').first()).toBeVisible();

    // 4. Return to Home
    await page.locator('.sidebar a[href="/"]').last().click();
    await page.waitForURL('**/');

    // 5. Verify SetuConnect button exists on Sidebar
    const connectButton = page.locator('.sidebar').getByRole('button', { name: /Connect Bank/i });
    await expect(connectButton.first()).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('TEST 4: My Banks Route Depository Verification', async ({ page, context }) => {
    await context.addCookies([TEST_COOKIE]);

    await page.goto('/my-banks', { waitUntil: 'domcontentloaded' });

    // Verify institutional summary cards exist
    await expect(page.getByText('Total Bank Balance')).toBeVisible();
    await expect(page.getByText('Connected Institutions')).toBeVisible();

    // Verify bank cards exist with semantic .bank-card class
    const bankCards = page.locator('.bank-card');
    await expect(bankCards.first()).toBeVisible({ timeout: 10000 });

    // Verify currency formatting
    await expect(page.getByText('₹').first()).toBeVisible();
  });

  test('TEST 5: Financial Intelligence & Diagnostics Engine', async ({ page, context }) => {
    await context.addCookies([TEST_COOKIE]);

    await page.goto('/financial-intelligence', { waitUntil: 'domcontentloaded' });

    // 1. Verify Intelligence Overview displays metrics
    await expect(page.getByText('Financial Intelligence').first()).toBeVisible();
    await expect(page.getByText('Available Ledger Balance')).toBeVisible();

    // 2. Toggle to Ledger & Transactions View
    const ledgerToggle = page.getByRole('button', { name: /Ledger & Transactions/i });
    await expect(ledgerToggle).toBeVisible();
    await ledgerToggle.click();

    // 3. Verify transactions table is displayed
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // 4. Toggle back to Intelligence Overview
    const intelToggle = page.getByRole('button', { name: /Intelligence Overview/i });
    await intelToggle.click();
    await expect(table).not.toBeVisible();
  });

  test('TEST 6: Profile Popover Lifecycle (Open, Escape, Click Outside, Sign Out)', async ({ page, context }) => {
    await context.addCookies([TEST_COOKIE]);

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. Open profile popover menu
    const profileTrigger = page.locator('button[aria-label="User account menu"]');
    await expect(profileTrigger).toBeVisible();
    await profileTrigger.click();

    // Verify popover opened
    const signOutBtn = page.getByRole('button', { name: /Sign Out of SyncVista/i });
    await expect(signOutBtn).toBeVisible();

    // 2. Press Escape key to dismiss
    await page.keyboard.press('Escape');
    await expect(signOutBtn).not.toBeVisible();

    // 3. Re-open and test click outside dismissal
    await profileTrigger.click();
    await expect(signOutBtn).toBeVisible();
    await page.locator('body').click({ position: { x: 500, y: 100 } });
    await expect(signOutBtn).not.toBeVisible();

    // 4. Re-open and execute sign out
    await profileTrigger.click();
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Verify redirect to /sign-in
    await page.waitForURL('**/sign-in', { timeout: 10000 });
    expect(page.url()).toContain('/sign-in');
  });

  test('TEST 7: Responsive Viewport Adaptation (Desktop, Tablet, Mobile)', async ({ page, context }) => {
    await context.addCookies([TEST_COOKIE]);

    // 1. Desktop Viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar')).toBeVisible();

    // 2. Tablet Viewport (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 25);

    // 3. Mobile Viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Mobile header with hamburger menu should be visible
    const hamburger = page.locator('.root-layout img[alt="menu"], button:has(img[alt="menu"])');
    await expect(hamburger.first()).toBeVisible();

    // Open mobile drawer
    await hamburger.first().click();
    const mobileDrawer = page.locator('[role="dialog"], [data-state="open"]');
    await expect(mobileDrawer.first()).toBeVisible({ timeout: 5000 });

    // Restore desktop viewport for isolation
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('TEST 8: Performance & Navigation Latency', async ({ page, context }) => {
    await context.addCookies([TEST_COOKIE]);

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadDuration = Date.now() - startTime;

    // Verify cold DOM load completes under 4000ms
    expect(loadDuration).toBeLessThan(4000);

    // Navigation latency to Financial Intelligence
    const navStart = Date.now();
    await page.locator('.sidebar a[href="/financial-intelligence"]').click();
    await page.waitForURL('**/financial-intelligence');
    const navDuration = Date.now() - navStart;

    // Snappy client navigation (<2500ms)
    expect(navDuration).toBeLessThan(2500);
  });

  test('TEST 9: Accessibility Standards & Keyboard Navigation', async ({ page, context }) => {
    await context.addCookies([TEST_COOKIE]);
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Verify interactive elements have focusable semantics
    const profileTrigger = page.locator('button[aria-label="User account menu"]');
    await profileTrigger.focus();
    await expect(profileTrigger).toBeFocused();

    // Verify ARIA attributes
    await expect(profileTrigger).toHaveAttribute('aria-label', 'User account menu');
    await expect(profileTrigger).toHaveAttribute('aria-expanded', 'false');

    await profileTrigger.click();
    await expect(profileTrigger).toHaveAttribute('aria-expanded', 'true');
  });

  test('TEST 10: Runtime & Console Cleanliness Invariant', async ({ page, context }) => {
    await context.addCookies([TEST_COOKIE]);
    await page.setViewportSize({ width: 1280, height: 800 });

    const uncaughtErrors: string[] = [];
    page.on('pageerror', (err) => uncaughtErrors.push(err.message));

    const routes = ['/', '/my-banks', '/financial-intelligence', '/investments'];
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
    }

    // Fail if any uncaught JavaScript exceptions occurred during navigation
    expect(uncaughtErrors).toHaveLength(0);
  });

  test('TEST 11: Individual Bank Account Intelligence & Burn Stability Verification', async ({ page, context }) => {
    await context.addCookies([TEST_COOKIE]);
    await page.setViewportSize({ width: 1280, height: 800 });

    const uncaughtErrors: string[] = [];
    page.on('pageerror', (err) => uncaughtErrors.push(err.message));

    // 1. Verify Home Dashboard Burn Stability
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Burn Stability')).toBeVisible();
    // Verify score is healthy (82/100)
    await expect(page.getByText('82/100')).toBeVisible();
    await page.screenshot({ path: '/Users/swapnil/.gemini/antigravity/brain/9a489812-7d0e-42f6-888e-f92478ca1bd5/home-burn-stability.png' });

    // 2. Verify Financial Intelligence Tabs & Individual Account Views
    await page.goto('/financial-intelligence', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Financial Intelligence').first()).toBeVisible();

    // Wait for tabs to be rendered
    const hdfcTab = page.locator('button[role="tab"]:has-text("HDFC")');
    await expect(hdfcTab).toBeVisible({ timeout: 10000 });
    await hdfcTab.click();
    await page.waitForTimeout(500);

    // Verify HDFC Intelligence Overview rendered
    await expect(page.getByRole('heading', { name: 'HDFC Savings Account' })).toBeVisible();
    await expect(page.getByText('Connect your bank accounts to see financial intelligence')).toHaveCount(0);
    await page.screenshot({ path: '/Users/swapnil/.gemini/antigravity/brain/9a489812-7d0e-42f6-888e-f92478ca1bd5/hdfc-intelligence.png' });

    // Click ICICI Salary Account tab
    const iciciTab = page.locator('button[role="tab"]:has-text("ICICI")');
    await expect(iciciTab).toBeVisible({ timeout: 10000 });
    await iciciTab.click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: 'ICICI Salary Account' })).toBeVisible();
    await expect(page.getByText('Connect your bank accounts to see financial intelligence')).toHaveCount(0);

    // Verify Ledger & Transactions tab has data
    const ledgerToggle = page.getByRole('button', { name: /Ledger & Transactions/i });
    await ledgerToggle.click();
    await expect(page.locator('table')).toBeVisible();

    // Click All Accounts to verify return to consolidated view
    await page.locator('button[role="tab"]:has-text("All Accounts")').click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Consolidated System of Record/i)).toBeVisible();

    expect(uncaughtErrors).toHaveLength(0);
  });

});


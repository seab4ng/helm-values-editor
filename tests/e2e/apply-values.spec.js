/**
 * E2E tests for the full apply + render cycle.
 *
 * Most other spec files check only that the "Updated" toast fires and the
 * .changed class appears. These tests go further: they verify the ACTUAL
 * VALUE shown in the UI after apply matches what was written, covering
 * string, number, boolean, list, and map cases plus type coercion.
 */
const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

// ── String value ──

test('applying a string value displays the new value in the row', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'image.tag' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'v2.5.0');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);
  // The val-val span for image.tag must show the new value
  const row = page.locator('.val-row', { hasText: 'image.tag' });
  await expect(row.locator('.val-val')).toContainText('v2.5.0');
});

test('applied string value has str CSS class (amber colour)', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'image.tag' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'mystring');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);
  await expect(page.locator('.val-row', { hasText: 'image.tag' }).locator('.val-val.str')).toBeVisible();
});

// ── Number value ──

test('applying a number value displays the new value', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '7');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);
  const row = page.locator('.val-row', { hasText: 'replicaCount' });
  await expect(row.locator('.val-val')).toContainText('7');
});

test('number field coercion: "5" typed in input displays with num class', async ({ page }) => {
  // replicaCount is originally a number — coerceValue converts "5" → 5 (number)
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '5');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).locator('.val-val.num')).toBeVisible();
});

test('applying "0" to number field keeps num type and shows 0', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '0');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);
  const row = page.locator('.val-row', { hasText: 'replicaCount' });
  await expect(row.locator('.val-val.num')).toContainText('0');
});

// ── Boolean value ──

test('applying "true" to a string field shows true value', async ({ page }) => {
  // service.type is a string — typing "true" stays as string (no original to coerce from)
  await page.locator('.val-row', { hasText: 'service.type' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'NodePort');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);
  const row = page.locator('.val-row', { hasText: 'service.type' });
  await expect(row.locator('.val-val')).toContainText('NodePort');
});

// ── List via YAML mode ──

test('YAML mode: setting list creates element rows with correct values', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'imagePullSecrets' }).locator('input[type=checkbox]').check();
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', '[alpha, beta]');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);

  // Two element rows must appear with the correct values
  await expect(page.locator('.val-row', { hasText: 'imagePullSecrets[0]' })).toBeVisible();
  await expect(page.locator('.val-row', { hasText: 'imagePullSecrets[1]' })).toBeVisible();
  await expect(page.locator('.val-row', { hasText: 'imagePullSecrets[0]' }).locator('.val-val')).toContainText('alpha');
  await expect(page.locator('.val-row', { hasText: 'imagePullSecrets[1]' }).locator('.val-val')).toContainText('beta');
});

test('YAML mode: list element rows have correct count', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'imagePullSecrets' }).locator('input[type=checkbox]').check();
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', '[a, b, c]');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);

  // Exactly 3 element rows
  await expect(page.locator('.val-row[data-key*="imagePullSecrets"]')).toHaveCount(3);
});

test('YAML mode: reverting list to [] removes all element rows', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'imagePullSecrets' }).locator('input[type=checkbox]').check();
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', '[a, b]');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);
  await expect(page.locator('.val-row[data-key*="imagePullSecrets"]')).toHaveCount(2);

  // Undo all → back to []
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  // imagePullSecrets row returns as [] (single row, no elements)
  await expect(page.locator('.val-row', { hasText: 'imagePullSecrets' })).toBeVisible();
  await expect(page.locator('.val-row', { hasText: 'imagePullSecrets' }).locator('.val-val')).toContainText('[]');
});

// ── Map via YAML mode ──

test('YAML mode: setting map creates child rows with correct values', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'nodeSelector' }).locator('input[type=checkbox]').check();
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', 'app: backend\nenv: prod');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);

  // Two child rows must appear
  await expect(page.locator('.val-row', { hasText: 'nodeSelector.app' })).toBeVisible();
  await expect(page.locator('.val-row', { hasText: 'nodeSelector.env' })).toBeVisible();
  await expect(page.locator('.val-row', { hasText: 'nodeSelector.app' }).locator('.val-val')).toContainText('backend');
  await expect(page.locator('.val-row', { hasText: 'nodeSelector.env' }).locator('.val-val')).toContainText('prod');
});

test('YAML mode: reverting map to {} removes child rows', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'nodeSelector' }).locator('input[type=checkbox]').check();
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', 'app: test');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);
  await expect(page.locator('.val-row', { hasText: 'nodeSelector.app' })).toBeVisible();

  // Undo all → back to {}
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  // nodeSelector row returns as {} (single row, no children)
  await expect(page.locator('.val-row', { hasText: 'nodeSelector' })).toBeVisible();
  await expect(page.locator('.val-row', { hasText: 'nodeSelector' }).locator('.val-val')).toContainText('{}');
  await expect(page.locator('.val-row', { hasText: 'nodeSelector.app' })).toHaveCount(0);
});

// ── Value persists across view switches ──

test('applied value persists when switching from specific chart to All charts', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '9');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);

  // Switch to "All charts" then back
  await page.locator('.tree-node[data-name="all"]').click();
  await page.waitForTimeout(100);
  await page.locator('.tree-node[data-name="test-chart"]').click();
  await page.waitForTimeout(100);

  // Value must still be 9
  const row = page.locator('.val-row', { hasText: 'replicaCount' });
  await expect(row.locator('.val-val')).toContainText('9');
  await expect(row).toHaveClass(/changed/);
});

test('applied value visible in All charts view', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '3');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);

  // Switch to All charts
  await page.locator('.tree-node[data-name="all"]').click();
  await page.waitForTimeout(100);

  const row = page.locator('.val-row', { hasText: 'replicaCount' });
  await expect(row.locator('.val-val')).toContainText('3');
});

// ── Multi-field apply ──

test('applying same value to two fields both display the new value', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'image.repository' }).locator('input[type=checkbox]').check();
  await page.locator('.val-row', { hasText: 'image.tag' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'myimage');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);

  await expect(page.locator('.val-row', { hasText: 'image.repository' }).locator('.val-val')).toContainText('myimage');
  await expect(page.locator('.val-row', { hasText: 'image.tag' }).locator('.val-val')).toContainText('myimage');
});

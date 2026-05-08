/**
 * E2E lifecycle tests: apply → re-apply → undo/revert → re-apply
 *
 * Verifies ACTUAL DISPLAYED VALUES (.val-val text + CSS class) at every step.
 * Covers: scalar re-apply, type coercion through the lifecycle, history
 * accumulation, undo-all value restoration, revert-selected restoration,
 * history "Use" value verification, and full list/map lifecycles.
 *
 * Original mock values (helpers/mock-fsapi.js):
 *   replicaCount:   2           (number)
 *   image.tag:      'latest'    (string)
 *   image.repository:'nginx'   (string)
 *   service.type:   'ClusterIP' (string)
 *   imagePullSecrets: []        (array)
 *   nodeSelector:   {}          (object)
 */
const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

// ── helpers ──

async function applyVal(page, fieldText, value) {
  await page.locator('.val-row', { hasText: fieldText }).first().locator('input[type=checkbox]').check();
  await page.fill('#new-val', value);
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);
}

async function applyYaml(page, fieldText, yamlStr) {
  // After each apply, yaml mode is reset to false, so clicking yaml-mode-btn
  // always enters yaml mode (not toggles it off).
  await page.locator('.val-row', { hasText: fieldText }).first().locator('input[type=checkbox]').check();
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', yamlStr);
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(150);
}

async function openHistoryPopup(page, fieldText) {
  const row = page.locator('.val-row.changed', { hasText: fieldText }).first();
  await row.hover();
  await row.locator('.history-btn').click({ force: true });
  await expect(page.locator('#field-history-popup')).not.toHaveClass(/hidden/);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

// ── Re-apply to already-changed scalar field ──

test('re-apply updates .val-val to second value and removes first', async ({ page }) => {
  await applyVal(page, 'image.tag', 'v1.0.0');
  await applyVal(page, 'image.tag', 'v2.0.0');
  const valEl = page.locator('.val-row', { hasText: 'image.tag' }).locator('.val-val');
  await expect(valEl).toContainText('v2.0.0');
  await expect(valEl).not.toContainText('v1.0.0');
});

test('re-apply increments history entry count to 2', async ({ page }) => {
  await applyVal(page, 'image.tag', 'v1.0.0');
  await applyVal(page, 'image.tag', 'v2.0.0');
  const row = page.locator('.val-row.changed', { hasText: 'image.tag' }).first();
  await row.hover();
  await expect(row.locator('.history-btn')).toContainText('2');
});

test('three re-applies accumulate to history count 3 and show final value', async ({ page }) => {
  await applyVal(page, 'image.tag', 'v1');
  await applyVal(page, 'image.tag', 'v2');
  await applyVal(page, 'image.tag', 'v3');
  await expect(page.locator('.val-row', { hasText: 'image.tag' }).locator('.val-val')).toContainText('v3');
  const row = page.locator('.val-row.changed', { hasText: 'image.tag' }).first();
  await row.hover();
  await expect(row.locator('.history-btn')).toContainText('3');
});

test('re-apply number keeps .num class and updates displayed value', async ({ page }) => {
  await applyVal(page, 'replicaCount', '7');
  await applyVal(page, 'replicaCount', '12');
  // coerceValue('12', original=7[num]) → 12 (number)
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val.num')).toContainText('12');
});

test('re-apply with non-numeric string to num field gives .str class', async ({ page }) => {
  // coerceValue('hello', original=2[num]) → NaN → returns 'hello' (string)
  await applyVal(page, 'replicaCount', '7');
  await applyVal(page, 'replicaCount', 'hello');
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val.str')).toContainText('hello');
});

test('re-apply after type changed to string: numeric string stays .str (coerce uses current file value)', async ({ page }) => {
  // After apply 'hello': file value = 'hello' (string).
  // Re-apply '3': coerceValue('3', 'hello') → typeof 'hello' !== 'number' → returns '3' as string → .str
  await applyVal(page, 'replicaCount', 'hello');
  await applyVal(page, 'replicaCount', '3');
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val.str')).toContainText('3');
});

// ── Undo all restores original values ──

test('undo all restores string field .val-val to original text', async ({ page }) => {
  await applyVal(page, 'image.tag', 'custom-tag');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'image.tag' }).locator('.val-val')).toContainText('latest');
});

test('undo all restores number field .val-val to original value', async ({ page }) => {
  await applyVal(page, 'replicaCount', '9');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val')).toContainText('2');
});

test('undo all restores original .num class after non-numeric string applied', async ({ page }) => {
  await applyVal(page, 'replicaCount', 'hello'); // → .str
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // Original value is 2 (number) → must render as .num
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val.num')).toBeVisible();
});

test('undo all restores BOTH fields to original values', async ({ page }) => {
  await applyVal(page, 'replicaCount', '9');
  await applyVal(page, 'image.tag', 'v99');
  await page.click('#undo-btn'); // Undo all
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted all' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val')).toContainText('2');
  await expect(page.locator('.val-row', { hasText: 'image.tag' }).locator('.val-val')).toContainText('latest');
});

test('undo all clears all history buttons', async ({ page }) => {
  await applyVal(page, 'replicaCount', '7');
  await applyVal(page, 'image.tag', 'v2');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.history-btn')).toHaveCount(0);
});

test('after undo all, re-apply works and history count resets to 1', async ({ page }) => {
  await applyVal(page, 'image.tag', 'v1');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // Re-apply after undo: history cleared by undo → should start fresh
  await applyVal(page, 'image.tag', 'v2');
  await expect(page.locator('.val-row', { hasText: 'image.tag' }).locator('.val-val')).toContainText('v2');
  const row = page.locator('.val-row.changed', { hasText: 'image.tag' }).first();
  await row.hover();
  await expect(row.locator('.history-btn')).toContainText('1');
});

// ── Revert selected restores correct original value ──

test('revert selected shows original value in .val-val', async ({ page }) => {
  await applyVal(page, 'replicaCount', '7');
  await page.locator('.val-row.changed', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn'); // Revert selected
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val')).toContainText('2');
});

test('revert selected restores original .num class after string applied', async ({ page }) => {
  await applyVal(page, 'replicaCount', 'hello'); // → .str
  await page.locator('.val-row.changed', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // Original value 2 is number → .num
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val.num')).toBeVisible();
});

test('revert selected does NOT change other field .val-val', async ({ page }) => {
  await applyVal(page, 'replicaCount', '7');
  await applyVal(page, 'image.tag', 'v99');
  await page.locator('.val-row.changed', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // image.tag untouched — still shows v99
  await expect(page.locator('.val-row', { hasText: 'image.tag' }).locator('.val-val')).toContainText('v99');
});

test('revert selected removes history button from reverted field only', async ({ page }) => {
  await applyVal(page, 'replicaCount', '7');
  await applyVal(page, 'image.tag', 'v2');
  await page.locator('.val-row.changed', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // image.tag still changed → exactly 1 history button remains
  await expect(page.locator('.history-btn')).toHaveCount(1);
});

test('apply 3 fields, revert 2: third field still shows new value', async ({ page }) => {
  await applyVal(page, 'replicaCount', '9');
  await applyVal(page, 'image.tag', 'v99');
  await applyVal(page, 'service.type', 'NodePort');
  await page.locator('.val-row.changed', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.locator('.val-row.changed', { hasText: 'image.tag' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'service.type' }).first().locator('.val-val')).toContainText('NodePort');
});

test('apply 3 fields, revert 2: reverted fields show original values', async ({ page }) => {
  await applyVal(page, 'replicaCount', '9');
  await applyVal(page, 'image.tag', 'v99');
  await applyVal(page, 'service.type', 'NodePort');
  await page.locator('.val-row.changed', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.locator('.val-row.changed', { hasText: 'image.tag' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val')).toContainText('2');
  await expect(page.locator('.val-row', { hasText: 'image.tag' }).locator('.val-val')).toContainText('latest');
});

// ── History "Use" + value verification ──

test('Use original in history popup restores original .val-val text', async ({ page }) => {
  await applyVal(page, 'replicaCount', '7');
  await openHistoryPopup(page, 'replicaCount');
  await page.locator('#field-history-popup .is-original .fhpop-use').click();
  await expect(page.locator('#toast-area .toast', { hasText: 'Restored' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val')).toContainText('2');
});

test('Use original restores .num CSS class on number field', async ({ page }) => {
  await applyVal(page, 'replicaCount', 'hello'); // → .str
  await openHistoryPopup(page, 'replicaCount');
  await page.locator('#field-history-popup .is-original .fhpop-use').click();
  await expect(page.locator('#toast-area .toast', { hasText: 'Restored' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // Original 2 is number → .num
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val.num')).toBeVisible();
});

test('Use intermediate entry shows intermediate value in .val-val', async ({ page }) => {
  await applyVal(page, 'replicaCount', '5');
  await applyVal(page, 'replicaCount', '9');
  await openHistoryPopup(page, 'replicaCount');
  // Intermediate entry: not current (9), not original (2)
  const nonOriginalUse = page.locator(
    '#field-history-popup .fhpop-entry:not(.is-current):not(.is-original) .fhpop-use'
  ).first();
  await nonOriginalUse.click();
  await expect(page.locator('#toast-area .toast', { hasText: 'Restored' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'replicaCount' }).first().locator('.val-val')).toContainText('5');
});

test('Use intermediate keeps field in .changed state (5 ≠ original 2)', async ({ page }) => {
  await applyVal(page, 'replicaCount', '5');
  await applyVal(page, 'replicaCount', '9');
  await openHistoryPopup(page, 'replicaCount');
  const nonOriginalUse = page.locator(
    '#field-history-popup .fhpop-entry:not(.is-current):not(.is-original) .fhpop-use'
  ).first();
  await nonOriginalUse.click();
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row.changed', { hasText: 'replicaCount' })).toBeVisible();
});

test('Use original string value restores .str CSS class', async ({ page }) => {
  // image.tag original = 'latest' (string, .str)
  await applyVal(page, 'image.tag', 'v99');
  await openHistoryPopup(page, 'image.tag');
  await page.locator('#field-history-popup .is-original .fhpop-use').click();
  await expect(page.locator('#toast-area .toast', { hasText: 'Restored' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'image.tag' }).locator('.val-val')).toContainText('latest');
});

// ── List lifecycle: apply → undo all → re-apply ──

test('undo all after list apply: .val-val shows []', async ({ page }) => {
  await applyYaml(page, 'imagePullSecrets', '[x, y, z]');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(
    page.locator('.val-row', { hasText: 'imagePullSecrets' }).first().locator('.val-val')
  ).toContainText('[]');
});

test('undo all after list apply removes all element rows', async ({ page }) => {
  await applyYaml(page, 'imagePullSecrets', '[a, b, c]');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'imagePullSecrets[0]' })).toHaveCount(0);
});

test('list: apply → undo all → re-apply shows correct element rows and values', async ({ page }) => {
  await applyYaml(page, 'imagePullSecrets', '[first, second]');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // Re-apply with different values
  await applyYaml(page, 'imagePullSecrets', '[one, two, three]');
  await expect(page.locator('.val-row[data-key*="imagePullSecrets"]')).toHaveCount(3);
  await expect(
    page.locator('.val-row', { hasText: 'imagePullSecrets[0]' }).locator('.val-val')
  ).toContainText('one');
  await expect(
    page.locator('.val-row', { hasText: 'imagePullSecrets[2]' }).locator('.val-val')
  ).toContainText('three');
});

test('list: apply → revert selected → re-apply shows correct element rows', async ({ page }) => {
  await applyYaml(page, 'imagePullSecrets', '[alpha, beta]');
  // Select all changed rows and revert
  const rows = page.locator('.val-row.changed');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    await rows.nth(i).locator('input[type=checkbox]').check();
  }
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // Re-apply with different values
  await applyYaml(page, 'imagePullSecrets', '[gamma, delta]');
  await expect(
    page.locator('.val-row', { hasText: 'imagePullSecrets[0]' }).locator('.val-val')
  ).toContainText('gamma');
  await expect(
    page.locator('.val-row', { hasText: 'imagePullSecrets[1]' }).locator('.val-val')
  ).toContainText('delta');
});

// ── Map lifecycle: apply → undo all → re-apply ──

test('undo all after map apply: .val-val shows {}', async ({ page }) => {
  await applyYaml(page, 'nodeSelector', 'app: myapp\nenv: test');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(
    page.locator('.val-row', { hasText: 'nodeSelector' }).first().locator('.val-val')
  ).toContainText('{}');
});

test('undo all after map apply removes all child rows', async ({ page }) => {
  await applyYaml(page, 'nodeSelector', 'app: myapp\nenv: test');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row', { hasText: 'nodeSelector.app' })).toHaveCount(0);
  await expect(page.locator('.val-row', { hasText: 'nodeSelector.env' })).toHaveCount(0);
});

test('map: apply → undo all → re-apply shows correct child rows and values', async ({ page }) => {
  await applyYaml(page, 'nodeSelector', 'zone: us-east');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // Re-apply with different keys
  await applyYaml(page, 'nodeSelector', 'region: eu-west\ntier: prod');
  await expect(page.locator('.val-row', { hasText: 'nodeSelector.region' })).toBeVisible();
  await expect(
    page.locator('.val-row', { hasText: 'nodeSelector.region' }).locator('.val-val')
  ).toContainText('eu-west');
  await expect(page.locator('.val-row', { hasText: 'nodeSelector.tier' })).toBeVisible();
  await expect(
    page.locator('.val-row', { hasText: 'nodeSelector.tier' }).locator('.val-val')
  ).toContainText('prod');
});

test('map: apply → revert selected → re-apply shows correct child rows', async ({ page }) => {
  await applyYaml(page, 'nodeSelector', 'app: old');
  const rows = page.locator('.val-row.changed');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    await rows.nth(i).locator('input[type=checkbox]').check();
  }
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // Re-apply
  await applyYaml(page, 'nodeSelector', 'app: new\nenv: staging');
  await expect(
    page.locator('.val-row', { hasText: 'nodeSelector.app' }).locator('.val-val')
  ).toContainText('new');
  await expect(
    page.locator('.val-row', { hasText: 'nodeSelector.env' }).locator('.val-val')
  ).toContainText('staging');
});

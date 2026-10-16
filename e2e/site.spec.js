import { test, expect } from '@playwright/test';

async function openSite(page) {
  await page.clock.install({ time: new Date('2026-10-18T00:00:00Z') });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.doctor-card')).toHaveCount(7);
}

async function fillBooking(page) {
  await page.locator('#name').fill('Pasien Uji');
  await page.locator('#wa').fill('0812-3456-7890');
  await page.locator('#service').selectOption('scaling');
  await page.locator('#doctor').selectOption('firda');
  await page.locator('#date').fill('2026-10-19');
  await page.locator('#slot').selectOption('08:00');
  await page.locator('#consent').check();
}

test('renders real poster-based names, compiled styles, favicon and an actual Maps embed', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openSite(page);
  await expect(page.locator('h1')).toHaveText('Perawatan gigi yang terasa lebih tenang.');
  await expect(page.locator('#doctor-grid')).toContainText('drg. Eka');
  await expect(page.locator('#doctor-grid')).toContainText('drg. Isna');
  await expect(page.locator('#doctor option')).toHaveCount(8);
  await expect(page.locator('script[src*="cdn.tailwindcss.com"]')).toHaveCount(0);
  await expect(page.locator('#dokter')).toHaveCSS('padding-top', /64px|96px/);
  await expect(page.locator('iframe[title*="Google Maps"]')).toHaveAttribute('src', /maps\.google\.com\/maps\?.*output=embed/);
  const favicon = page.locator('link[rel="icon"][type="image/svg+xml"]');
  const iconResponse = await page.request.get(await favicon.getAttribute('href'));
  expect(iconResponse.ok()).toBeTruthy();
  expect(errors).toEqual([]);
});

test('doctor choice carries through the summary and encoded WhatsApp request', async ({ page }) => {
  await openSite(page);
  await page.getByRole('button', { name: 'Pilih drg. Firda', exact: true }).click();
  await expect(page.locator('#doctor')).toHaveValue('firda');
  await fillBooking(page);
  await page.locator('#notes').fill('Gigi sensitif & ingin konsultasi <b>lebih dulu</b>.');
  await page.locator('.booking-submit').click();
  const dialog = page.getByRole('dialog', { name: 'Ringkasan permintaan' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('drg. Firda');
  await expect(dialog).toContainText('08:00 WIB');
  await expect(dialog).toContainText('jadwal ini belum dikonfirmasi', { ignoreCase: true });
  await expect(dialog.locator('b')).toHaveCount(0);
  const link = dialog.getByRole('link', { name: 'Lanjutkan ke WhatsApp' });
  const url = new URL(await link.getAttribute('href'));
  expect(url.hostname).toBe('wa.me');
  expect(url.pathname).toBe('/6281359599996');
  expect(url.searchParams.get('text')).toContain('Dokter pilihan: drg. Firda');
  expect(url.searchParams.get('text')).toContain('Gigi sensitif & ingin konsultasi <b>lebih dulu</b>.');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.booking-submit')).toBeFocused();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('rejects invalid requests and respects off-days and conditional Sundays', async ({ page }) => {
  await openSite(page);
  await page.locator('.booking-submit').click();
  await expect(page.locator('#booking-error')).toContainText('Isi nama pasien');
  await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('#doctor').selectOption('firda');
  await page.locator('#date').fill('2026-10-21');
  await expect(page.locator('#slot')).toBeDisabled();
  await expect(page.locator('#schedule-note')).toContainText('Tidak ada jam');
  await page.locator('#doctor').selectOption('shania');
  await page.locator('#date').fill('2026-10-25');
  await expect(page.locator('#slot')).toBeDisabled();
  await expect(page.locator('#schedule-note')).toContainText('konfirmasi admin');
  await page.locator('#doctor').selectOption('isna');
  await page.locator('#date').fill('2026-10-23');
  await expect(page.locator('#slot option[value="12:30"]')).toHaveCount(1);
  await expect(page.locator('#slot option[value="14:00"]')).toHaveCount(0);
});

test('service detail and gallery dialogs work with Escape and focus restoration', async ({ page }) => {
  await openSite(page);
  const service = page.locator('[data-service-key="scaling"]').first();
  await service.click();
  const dialog = page.locator('#service-detail-modal');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Pilih layanan ini' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('#service')).toHaveValue('scaling');
  await expect(page.locator('#service')).toBeFocused();
  const gallery = page.locator('[data-gallery-image]');
  await gallery.click();
  const imageDialog = page.locator('#image-dialog');
  await expect(imageDialog).toBeVisible();
  await expect(imageDialog.locator('img')).toHaveAttribute('alt', /bukan foto asli/);
  await expect(imageDialog.locator('img')).toHaveJSProperty('complete', true);
  await page.keyboard.press('Escape');
  await expect(imageDialog).not.toBeVisible();
  await expect(gallery).toBeFocused();
});

test('FAQ state and compact navigation are accessible', async ({ page }) => {
  await openSite(page);
  const faq = page.locator('.faq-button').nth(1);
  await faq.click();
  await expect(faq).toHaveAttribute('aria-expanded', 'true');
  const contentId = await faq.getAttribute('aria-controls');
  await expect(page.locator('#' + contentId)).toBeVisible();
  await faq.click();
  await expect(faq).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#' + contentId)).not.toBeVisible();
  const menu = page.locator('#menu-toggle-btn');
  if (await menu.isVisible()) {
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
    await menu.click();
    await page.locator('#mobile-nav-panel a[href="#biaya"]').click();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
  }
});

test('fits narrow phones through wide desktop without overflowing controls', async ({ page }) => {
  await openSite(page);
  for (const width of [360, 390, 640, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth > window.innerWidth,
      controls: [...document.querySelectorAll('header a, header button, #booking-form input, #booking-form select, #booking-form textarea')]
        .filter(node => node.getClientRects().length)
        .filter(node => { const rect = node.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1; })
        .map(node => node.id || node.textContent.trim()),
    }));
    expect(overflow, 'Overflow at viewport ' + width).toEqual({ document: false, controls: [] });
  }
});

test('reduced motion keeps content visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSite(page);
  await expect(page.locator('.reveal-ready')).toHaveCount(0);
  await expect(page.locator('.doctor-card').first()).toHaveCSS('opacity', '1');
});

test('remains informative without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#dokter')).toContainText('drg. Eka');
    await expect(page.locator('.faq-content').first()).toBeVisible();
    await expect(page.locator('#patient-reviews')).toContainText('tidak menggunakan ulasan atau rating rekaan');
    await expect(page.locator('a[href="https://instagram.com"], a[href="https://maps.google.com"]')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('captures the homepage and updated team section', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSite(page);
  await page.screenshot({ path: testInfo.outputPath('homepage.png') });
  await page.locator('#dokter').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('doctors.png') });
});

import { test, expect } from '@playwright/test';

async function openSite(page) {
  await page.clock.install({ time: new Date('2026-10-18T00:00:00Z') });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.doctor-card')).toHaveCount(10);
}

async function fillBooking(page) {
  await page.locator('#name').fill('Pasien Uji');
  await page.locator('#wa').fill('0812-3456-7890');
  await page.locator('#service').selectOption('scaling');
  await page.locator('#doctor').selectOption('firda');
  await page.locator('#date').fill('2026-10-19');
  await page.locator('#time').selectOption('pagi');
  await page.locator('#consent').check();
}

test('renders the refined hero, media placeholder, quick booking band, and real Maps embed', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openSite(page);
  await expect(page.locator('h1')).toHaveText('Perawatan gigi yang terasa lebih tenang.');
  await expect(page.getByRole('link', { name: 'Buat Janji', exact: true }).first()).toHaveAttribute('href', '#reservasi');
  await expect(page.getByRole('link', { name: 'Lihat Layanan', exact: true })).toHaveAttribute('href', '#perawatan');
  await expect(page.locator('.hero-note')).toContainText('Jadwal dikonfirmasi oleh admin klinik.');
  await expect(page.locator('.clinic-media-label').first()).toHaveText('Media klinik akan ditambahkan');
  await expect(page.locator('#ajukan')).toContainText('Sudah tahu yang Anda butuhkan?');
  await expect(page.locator('#doctor-grid')).toContainText('drg. Eka');
  await expect(page.locator('#doctor-grid')).toContainText('drg. Isna');
  await expect(page.locator('#doctor-grid')).toContainText('dr. Hamidi');
  await expect(page.locator('#doctor-grid')).toContainText('dr. Nadelia');
  await expect(page.locator('#doctor option')).toHaveCount(11);
  await expect(page.locator('#dokter')).toHaveCSS('padding-top', /64px|96px/);
  await expect(page.locator('iframe[title*="Google Maps"]')).toHaveAttribute('src', /maps\.google\.com\/maps\?.*output=embed/);
  const favicon = page.locator('link[rel="icon"][type="image/svg+xml"]');
  const iconResponse = await page.request.get(await favicon.getAttribute('href'));
  expect(iconResponse.ok()).toBeTruthy();
  expect(errors).toEqual([]);
});

test('every doctor card shows its real poster without broken images', async ({ page }) => {
  await openSite(page);
  const images = page.locator('.doctor-card .clinic-media-img');
  const total = await images.count();
  expect(total).toBe(10);
  for (let index = 0; index < total; index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate(node => node.naturalWidth), `Broken image #${index}`).toBeGreaterThan(0);
  }
  const photos = page.locator('.doctor-card img:not([aria-hidden="true"])');
  await expect(photos).toHaveCount(10);
  for (let index = 0; index < 10; index += 1) {
    await expect(photos.nth(index)).toHaveAttribute('alt', /^drg?\. \S+, Dokter /);
  }
});

test('has no dead links and every internal anchor target exists', async ({ page }) => {
  await openSite(page);
  await expect(page.locator('a[href="#"]')).toHaveCount(0);
  const fragments = await page.locator('a[href^="#"]').evaluateAll(links => [...new Set(links
    .map(link => link.getAttribute('href'))
    .filter(href => href.length > 1))]);
  expect(fragments.length).toBeGreaterThan(0);
  for (const fragment of fragments) {
    await expect(page.locator(fragment), `Missing target for ${fragment}`).toHaveCount(1);
  }
  await expect(page.locator('a[href*="wa.me"]').first()).toHaveAttribute('rel', /noopener/);
});

test('service details open a dialog with an examination note and a booking CTA', async ({ page }) => {
  await openSite(page);
  const trigger = page.locator('[data-service-key="scaling"]').first();
  await expect(trigger).toHaveJSProperty('tagName', 'BUTTON');
  await trigger.click();
  const dialog = page.locator('#service-detail-modal');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Siapa yang perlu berkonsultasi');
  await expect(dialog).toContainText('Tindakan akhir ditentukan bersama dokter setelah pemeriksaan.');
  await dialog.getByRole('button', { name: 'Ajukan Kunjungan' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('#service')).toHaveValue('scaling');
  await expect(page.locator('#service')).toBeFocused();
});

test('empty form shows inline errors and never opens a review dialog', async ({ page }) => {
  await openSite(page);
  await expect(page.locator('#date')).toHaveValue('');
  await page.locator('.booking-submit').click();
  await expect(page.locator('#booking-error')).toContainText('Lengkapi bagian yang ditandai');
  await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#name-error')).toContainText('Isi nama pasien');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.locator('#name').fill('Pasien Uji');
  await page.locator('#wa').fill('0812abc');
  await page.locator('.booking-submit').click();
  await expect(page.locator('#wa-error')).toContainText('nomor WhatsApp Indonesia yang valid');
  await expect(page.locator('#wa')).toHaveAttribute('aria-invalid', 'true');

  await page.locator('#wa').fill('0812-3456-7890');
  await page.locator('#date').fill('2026-10-01');
  await page.locator('#time').selectOption('sore');
  await page.locator('#consent').check();
  await page.locator('.booking-submit').click();
  await expect(page.locator('#date-error')).toContainText('mulai hari ini');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('reviewed request carries the chosen preferences into the WhatsApp handoff', async ({ page }) => {
  await openSite(page);
  await page.getByRole('button', { name: 'Pilih drg. Firda', exact: true }).click();
  await expect(page.locator('#doctor')).toHaveValue('firda');
  await fillBooking(page);
  await page.locator('#notes').fill('Gigi sensitif & ingin konsultasi <b>lebih dulu</b>.');
  await page.locator('.booking-submit').click();
  const dialog = page.getByRole('dialog', { name: 'Ringkasan permintaan' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('drg. Firda');
  await expect(dialog).toContainText('Pagi');
  await expect(dialog).toContainText('jadwal belum dikonfirmasi', { ignoreCase: true });
  await expect(dialog.locator('b')).toHaveCount(0);
  const link = dialog.getByRole('link', { name: 'Lanjutkan ke WhatsApp' });
  const url = new URL(await link.getAttribute('href'));
  expect(url.hostname).toBe('wa.me');
  expect(url.pathname).toBe('/6281359599996');
  expect(url.searchParams.get('text')).toContain('Dokter pilihan: drg. Firda');
  expect(url.searchParams.get('text')).toContain('Preferensi waktu: Pagi');
  expect(url.searchParams.get('text')).toContain('Gigi sensitif & ingin konsultasi <b>lebih dulu</b>.');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.booking-submit')).toBeFocused();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('continuing to WhatsApp shows a clear handoff and success state', async ({ page }) => {
  await openSite(page);
  await page.context().route('https://wa.me/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>stub</body></html>' }));
  await fillBooking(page);
  await page.locator('.booking-submit').click();
  const dialog = page.locator('#booking-modal');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Ringkasan permintaan');
  const link = dialog.getByRole('link', { name: 'Lanjutkan ke WhatsApp' });
  const [popup] = await Promise.all([page.waitForEvent('popup'), link.click()]);
  await popup.close();
  await expect(dialog).toContainText('Permintaan siap dikirim');
  await expect(dialog).toContainText('belum pasti');
  await expect(dialog.getByRole('link', { name: 'Buka WhatsApp lagi' })).toHaveAttribute('href', /wa\.me/);
  await expect(page.locator('#booking-success')).toContainText('Permintaan kunjungan sudah disiapkan di WhatsApp');
  await dialog.getByRole('button', { name: 'Tutup ringkasan' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.booking-submit')).toBeFocused();
});

test('compact navigation exposes every required destination with 44px mobile targets', async ({ page }) => {
  await openSite(page);
  const menu = page.locator('#menu-toggle-btn');
  if (await menu.isVisible()) {
    await menu.click();
    const panel = page.locator('#mobile-nav-panel');
    for (const [label, href] of [
      ['Layanan', '#perawatan'], ['Biaya', '#biaya'], ['Dokter', '#dokter'],
      ['FAQ', '#faq'], ['Lokasi', '#lokasi'], ['Buat Janji', '#reservasi'],
    ]) {
      await expect(panel.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
    }
    const bookBox = await page.locator('.mobile-bottom-bar .mbb-book').boundingBox();
    expect(bookBox.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
  } else {
    for (const label of ['Perawatan', 'Biaya', 'Dokter', 'FAQ', 'Lokasi']) {
      await expect(page.locator('header nav').getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  }
});

test('FAQ accordion keeps ARIA state in sync', async ({ page }) => {
  await openSite(page);
  const faq = page.locator('.faq-button').nth(1);
  await faq.click();
  await expect(faq).toHaveAttribute('aria-expanded', 'true');
  const contentId = await faq.getAttribute('aria-controls');
  await expect(page.locator('#' + contentId)).toBeVisible();
  await faq.click();
  await expect(faq).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#' + contentId)).not.toBeVisible();
});

test('fits narrow phones through wide desktop without overflowing controls', async ({ page }) => {
  await openSite(page);
  for (const width of [360, 390, 640, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth > window.innerWidth,
      controls: [...document.querySelectorAll('header a, header button, #booking-form input, #booking-form select, #booking-form textarea, .mobile-bottom-bar a')]
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
    await expect(page.locator('#ulasan')).toContainText('Lihat pengalaman pasien di Google Maps');
    await expect(page.locator('.clinic-media-label').first()).toHaveText('Media klinik akan ditambahkan');
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

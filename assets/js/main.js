import { DENTISTS, getDentist } from './clinic-data.js';
import { initScrollReveals } from './reveals.js';
import { renderPatientReviews } from './reviews.js';
import {
  SERVICES, buildWhatsAppUrl, formatBookingDate, getDoctorLabel,
  getJakartaNow, getScheduleAvailability, validateBooking,
} from './booking.js';

const doctorPhotos = import.meta.glob('../images/doctors/*.{jpg,jpeg,png,webp}', {
  eager: true, query: '?url', import: 'default',
});
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function element(tag, className = '', text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Native modal behavior supplies focus containment and Escape support. */
function createDialog(id, title, extraClass = '') {
  const dialog = element('dialog', `modal-card font-body ${extraClass}`.trim());
  dialog.id = id;
  const heading = element('div', 'modal-heading');
  const titleNode = element('h2', 'font-headline', title);
  titleNode.id = `${id}-title`;
  dialog.setAttribute('aria-labelledby', titleNode.id);
  const closeButton = element('button', 'modal-close btn-secondary text-sm', 'Tutup');
  closeButton.type = 'button';
  closeButton.autofocus = true;
  closeButton.setAttribute('aria-label', 'Tutup dialog');
  const body = element('div', 'modal-body font-body text-sm');
  const actions = element('div', 'modal-actions');
  heading.append(titleNode, closeButton);
  dialog.append(heading, body, actions);
  document.body.append(dialog);

  let opener = null;
  let afterClose = null;
  const close = (callback = null) => {
    afterClose = typeof callback === 'function' ? callback : null;
    dialog.close();
  };
  closeButton.addEventListener('click', () => close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  dialog.addEventListener('close', () => {
    const callback = afterClose;
    afterClose = null;
    if (callback) callback();
    else if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  return {
    dialog, title: titleNode, body, actions, close,
    open() {
      opener = document.activeElement;
      if (!dialog.open) dialog.showModal();
    },
  };
}

let imageDialog;
function showImage(source, caption) {
  let url;
  try {
    url = new URL(source, document.baseURI);
    if (!['http:', 'https:'].includes(url.protocol)) return;
  } catch {
    return;
  }
  imageDialog ||= createDialog('image-dialog', 'Lihat gambar', 'image-dialog');
  imageDialog.title.textContent = caption;
  const image = element('img', 'image-dialog-image');
  image.alt = caption;
  image.addEventListener('error', () => {
    image.replaceWith(element('p', 'text-sm', 'Gambar tidak dapat dimuat. Silakan hubungi admin.'));
  }, { once: true });
  image.src = url.href;
  imageDialog.body.replaceChildren(image, element('p', 'image-dialog-caption text-sm', caption));
  imageDialog.open();
}

function initGallery() {
  document.querySelectorAll('button[data-gallery-image]').forEach(button => {
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => {
      const image = button.querySelector('img');
      const source = button.dataset.galleryImage || button.dataset.src
        || button.getAttribute('src') || image?.currentSrc || image?.getAttribute('src');
      if (!source) return;
      showImage(source, button.dataset.galleryCaption || image?.alt || 'Foto klinik');
    });
  });
}

function showPhotoFallback(portrait, doctor) {
  const initials = element('span', 'doctor-photo-fallback font-headline', doctor.initials);
  initials.setAttribute('aria-hidden', 'true');
  portrait.replaceChildren(initials, element('span', 'doctor-photo-note font-body text-sm', 'Foto dokter menyusul'));
}

function renderDoctors() {
  const select = document.getElementById('doctor');
  if (select) {
    const selected = select.value;
    select.replaceChildren(new Option('Tanpa preferensi dokter', ''));
    DENTISTS.forEach(doctor => select.add(new Option(doctor.name, doctor.key)));
    select.value = getDentist(selected) ? selected : '';
  }
  const grid = document.getElementById('doctor-grid');
  if (!grid) return;
  const cards = DENTISTS.map((doctor, index) => {
    const card = element('article', 'doctor-card');
    card.dataset.photoLayout = 'poster';
    const titleId = `doctor-${doctor.key}-title`;
    card.setAttribute('aria-labelledby', titleId);
    const portrait = element('div', 'doctor-portrait');
    portrait.dataset.photoLayout = 'poster';
    const photo = [`drg-${doctor.key}`, doctor.key].map(basename => Object.entries(doctorPhotos).find(
      ([path]) => path.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase() === basename,
    )).find(Boolean)?.[1];
    if (photo) {
      const button = element('button', 'doctor-photo-button');
      button.type = 'button';
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-label', `Lihat poster lengkap ${doctor.name}`);
      const image = element('img', 'doctor-portrait-image');
      image.alt = `Poster jadwal ${doctor.name}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => showPhotoFallback(portrait, doctor), { once: true });
      image.src = photo;
      button.append(image);
      button.addEventListener('click', () => showImage(photo, `Poster jadwal ${doctor.name}`));
      portrait.append(button);
    } else {
      showPhotoFallback(portrait, doctor);
    }
    const info = element('div', 'doctor-info');
    const number = element('span', 'doctor-number', String(index + 1).padStart(2, '0'));
    number.setAttribute('aria-hidden', 'true');
    const role = element('p', 'doctor-role font-body text-sm', doctor.role);
    const title = element('h3', 'font-headline', doctor.name);
    title.id = titleId;
    const schedule = element('ul', 'doctor-schedule font-body text-sm');
    doctor.scheduleLabels.forEach(label => schedule.append(element('li', '', label)));
    const bookButton = element('button', 'doctor-book-link', `Pilih ${doctor.name}`);
    bookButton.type = 'button';
    bookButton.setAttribute('aria-label', `Pilih ${doctor.name}`);
    bookButton.dataset.doctorKey = doctor.key;
    bookButton.addEventListener('click', () => {
      if (!select) return;
      select.value = doctor.key;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      focusBooking(select);
    });
    info.append(number, role, title, schedule, bookButton);
    card.append(portrait, info);
    return card;
  });
  grid.replaceChildren(...cards);
}

function focusBooking(field) {
  const form = document.getElementById('booking-form');
  form?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'instant' : 'auto' });
  field?.focus({ preventScroll: true });
}

let bookingDialog;
function showBookingSummary(booking) {
  bookingDialog ||= createDialog('booking-modal', 'Ringkasan permintaan');
  const summary = element('dl', 'modal-summary');
  const rows = [
    ['Nama', booking.name],
    ['WhatsApp', booking.wa],
    ['Layanan', SERVICES[booking.service]],
    ['Dokter pilihan', getDoctorLabel(booking.doctorKey)],
    ['Tanggal', formatBookingDate(booking.date)],
    ['Jam yang diminta', `${booking.slot} WIB`],
    ['Catatan (opsional)', booking.notes || 'Tidak ada catatan'],
  ];
  rows.forEach(([label, value]) => {
    const row = element('div', 'modal-summary-row');
    row.append(element('dt', '', label), element('dd', '', value));
    summary.append(row);
  });
  bookingDialog.body.replaceChildren(
    element('p', '', 'Periksa permintaan Anda. Jadwal ini belum dikonfirmasi dan data belum dikirim.'),
    summary,
    element('p', 'text-sm', 'Data, termasuk catatan yang Anda tulis, hanya diteruskan ke WhatsApp saat Anda mengeklik tautan di bawah. Admin perlu mengonfirmasi dokter dan waktu kunjungan. Formulir ini tidak menyimpan data Anda.'),
  );
  const waLink = element('a', 'btn-primary text-sm', 'Lanjutkan ke WhatsApp');
  waLink.href = buildWhatsAppUrl(booking);
  waLink.target = '_blank';
  waLink.rel = 'noopener noreferrer';
  bookingDialog.actions.replaceChildren(waLink);
  bookingDialog.open();
}

function ensureLiveOutput(form, id, after) {
  let output = document.getElementById(id);
  if (!output) {
    output = element('p', 'font-body text-sm');
    output.id = id;
    if (after) after.after(output);
    else form.append(output);
  }
  output.setAttribute('role', 'status');
  output.setAttribute('aria-live', 'polite');
  output.setAttribute('aria-atomic', 'true');
  return output;
}

function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;
  // Never allow a partial integration to submit patient data in a URL.
  form.addEventListener('submit', event => event.preventDefault());
  form.noValidate = true;
  const errorOutput = ensureLiveOutput(form, 'booking-error');
  errorOutput.tabIndex = -1;
  const fields = Object.fromEntries(
    ['name', 'wa', 'service', 'doctor', 'date', 'slot', 'notes', 'consent']
      .map(id => [id, form.querySelector(`#${id}`)]),
  );
  if (Object.values(fields).some(field => !field) || fields.slot.tagName !== 'SELECT') {
    errorOutput.textContent = 'Formulir belum lengkap. Silakan hubungi admin melalui WhatsApp.';
    return;
  }
  const scheduleNote = ensureLiveOutput(form, 'schedule-note', fields.slot);
  fields.slot.required = true;
  fields.consent.required = true;
  ['name', 'wa', 'service', 'date'].forEach(id => { fields[id].required = true; });
  Object.values(fields).forEach(field => {
    const describedBy = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    describedBy.add(errorOutput.id);
    if (field === fields.slot) describedBy.add(scheduleNote.id);
    field.setAttribute('aria-describedby', [...describedBy].join(' '));
  });
  if (!fields.date.value) fields.date.value = getJakartaNow().date;

  function refreshSchedule(now = new Date()) {
    fields.date.min = getJakartaNow(now).date;
    const previous = fields.slot.value;
    const availability = getScheduleAvailability({
      date: fields.date.value, doctorKey: fields.doctor.value, now,
    });
    const placeholder = new Option(
      availability.slots.length ? 'Pilih jam permintaan (WIB)' : 'Tidak ada jam — hubungi admin', '',
    );
    placeholder.disabled = true;
    fields.slot.replaceChildren(placeholder, ...availability.slots.map(time => new Option(`${time} WIB`, time)));
    fields.slot.disabled = availability.slots.length === 0;
    fields.slot.value = availability.slots.includes(previous) ? previous : '';
    scheduleNote.textContent = availability.note;
  }
  function clearErrors() {
    errorOutput.textContent = '';
    Object.values(fields).forEach(field => field.removeAttribute('aria-invalid'));
  }
  fields.date.addEventListener('change', () => refreshSchedule());
  fields.doctor.addEventListener('change', () => refreshSchedule());
  form.addEventListener('input', clearErrors);
  form.addEventListener('change', clearErrors);
  // Recompute elapsed times after a suspended tab or a Jakarta date rollover.
  form.addEventListener('focusin', event => {
    if ([fields.date, fields.doctor, fields.slot].includes(event.target)) refreshSchedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshSchedule();
  });
  window.addEventListener('focus', () => refreshSchedule());
  refreshSchedule();

  form.addEventListener('submit', () => {
    clearErrors();
    const now = new Date();
    refreshSchedule(now);
    const result = validateBooking({
      name: fields.name.value, wa: fields.wa.value, service: fields.service.value,
      doctorKey: fields.doctor.value, date: fields.date.value, slot: fields.slot.value,
      notes: fields.notes.value, consent: fields.consent.checked,
    }, now);
    if (!result.valid) {
      result.errors.forEach(error => fields[error.field]?.setAttribute('aria-invalid', 'true'));
      errorOutput.textContent = result.errors.map(error => error.message).join(' ');
      const first = fields[result.errors[0].field];
      (first && !first.disabled ? first : errorOutput).focus();
      return;
    }
    fields.name.value = result.booking.name;
    fields.wa.value = result.booking.wa;
    showBookingSummary(result.booking);
  });
}

const serviceDetails = {
  konsultasi: {
    title: 'Pemeriksaan & Konsultasi Dokter Gigi',
    description: 'Pemeriksaan untuk memahami kondisi gigi dan mulut serta mendiskusikan pilihan perawatan.',
    points: ['Sampaikan keluhan dan riwayat kesehatan yang relevan.', 'Rencana, biaya, dan kebutuhan pemeriksaan lanjutan dibahas bersama dokter.'],
  },
  scaling: {
    title: 'Scaling / Pembersihan Karang Gigi',
    description: 'Scaling bertujuan membersihkan plak dan karang gigi. Kebutuhan tindakan ditentukan setelah pemeriksaan.',
    points: ['Sensitivitas dan pengalaman selama tindakan dapat berbeda pada setiap pasien.', 'Dokter dapat menjelaskan perawatan kebersihan gigi setelah tindakan.'],
  },
  tambal: {
    title: 'Tambal Gigi',
    description: 'Penambalan merupakan salah satu pilihan untuk memperbaiki kerusakan gigi, tergantung luas dan kondisi kerusakannya.',
    points: ['Pilihan bahan dan kesesuaian perawatan perlu dinilai dokter.', 'Kerusakan tertentu mungkin membutuhkan perawatan lain atau rujukan.'],
  },
  cabut: {
    title: 'Cabut Gigi',
    description: 'Pencabutan dapat dipertimbangkan bila gigi tidak dapat dipertahankan atau terdapat indikasi lain setelah pemeriksaan.',
    points: ['Dokter menjelaskan pilihan, risiko, dan perawatan setelah tindakan.', 'Kasus yang lebih kompleks mungkin memerlukan pemeriksaan tambahan atau rujukan.'],
  },
  anak: {
    title: 'Perawatan Gigi Anak',
    description: 'Pemeriksaan dan edukasi kesehatan gigi anak disesuaikan dengan usia, kebutuhan, dan kesiapan anak.',
    points: ['Orang tua dapat menyampaikan riwayat kesehatan dan pengalaman perawatan anak.', 'Pilihan tindakan dibahas setelah dokter menilai kondisi gigi anak.'],
  },
  veneer: {
    title: 'Konsultasi Veneer / Perawatan Estetik',
    description: 'Konsultasi untuk membahas keinginan terkait tampilan gigi dan menilai kesesuaian pilihan perawatan.',
    points: ['Kondisi gigi dan gusi perlu diperiksa sebelum menentukan tindakan.', 'Hasil, risiko, biaya, dan kebutuhan pemeliharaan dapat berbeda untuk setiap pasien.'],
  },
};

function initServiceModals() {
  let modal;
  document.querySelectorAll('[data-service-key]').forEach(trigger => {
    trigger.addEventListener('click', event => {
      const key = trigger.dataset.serviceKey;
      if (!Object.hasOwn(serviceDetails, key)) return;
      event.preventDefault();
      const item = serviceDetails[key];
      modal ||= createDialog('service-detail-modal', 'Informasi layanan');
      modal.title.textContent = item.title;
      const list = element('ul', 'service-modal-list');
      item.points.forEach(point => list.append(element('li', '', point)));
      modal.body.replaceChildren(
        element('p', '', item.description),
        element('h3', 'font-headline', 'Yang perlu diketahui'),
        list,
        element('p', 'text-sm', 'Informasi umum, bukan diagnosis atau jaminan hasil. Ketersediaan layanan dan jadwal perlu dikonfirmasi kepada admin.'),
      );
      const book = element('button', 'btn-primary text-sm', 'Pilih layanan ini');
      book.type = 'button';
      book.addEventListener('click', () => {
        modal.close(() => {
          const select = document.getElementById('service');
          if (select) {
            select.value = key;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          focusBooking(select);
        });
      });
      modal.actions.replaceChildren(book);
      modal.open();
    });
  });
}

function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle-btn');
  const panel = document.getElementById('mobile-nav-panel');
  if (!toggle || !panel) return;
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', panel.id);
  const setOpen = open => {
    panel.hidden = !open;
    panel.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
    const icon = toggle.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = open ? 'close' : 'menu';
      icon.setAttribute('aria-hidden', 'true');
    }
  };
  setOpen(false);
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  panel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus({ preventScroll: true });
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', event => {
    if (event.matches) setOpen(false);
  });
}

function initFaqAccordion() {
  const entries = [...document.querySelectorAll('.faq-item')].map((item, index) => {
    const button = item.querySelector('.faq-button');
    const content = item.querySelector('.faq-content');
    if (!button || !content) return null;
    button.type = 'button';
    button.id ||= `faq-button-${index + 1}`;
    content.id ||= `faq-content-${index + 1}`;
    button.setAttribute('aria-controls', content.id);
    content.setAttribute('role', 'region');
    content.setAttribute('aria-labelledby', button.id);
    return { item, button, content };
  }).filter(Boolean);
  const setOpen = (entry, open) => {
    entry.item.classList.toggle('active', open);
    entry.button.setAttribute('aria-expanded', String(open));
    entry.content.hidden = !open;
  };
  entries.forEach(entry => {
    setOpen(entry, entry.item.classList.contains('active'));
    entry.button.addEventListener('click', () => {
      const open = entry.button.getAttribute('aria-expanded') !== 'true';
      entries.forEach(other => setOpen(other, other === entry && open));
    });
  });
}


function init() {
  document.querySelectorAll('.material-symbols-outlined').forEach(icon => icon.setAttribute('aria-hidden', 'true'));
  initMobileMenu();
  renderDoctors();
  renderPatientReviews();
  initGallery();
  initBookingForm();
  initServiceModals();
  initFaqAccordion();
  initScrollReveals();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

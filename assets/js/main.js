import mediaArtUrl from '../images/media-placeholder.svg';
import { DENTISTS, getDentist } from './clinic-data.js';
import { initScrollReveals } from './reveals.js';
import {
  SERVICES, TIME_PREFERENCES, buildWhatsAppUrl, formatBookingDate, getDoctorLabel,
  getJakartaToday, validateBooking,
} from './booking.js';

const MEDIA_LABEL = 'Media klinik akan ditambahkan';
const doctorPhotos = import.meta.glob('../images/doctors/*.{jpg,jpeg,png,webp}', {
  eager: true, query: '?url', import: 'default',
});
const doctorPhotoByKey = Object.fromEntries(Object.entries(doctorPhotos).map(([path, url]) => [
  path.split('/').pop().replace(/\.[^.]+$/, '').replace(/^drg-/, '').toLowerCase(), url,
]));
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function element(tag, className = '', text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Reusable media slot with a stable aspect ratio. The placeholder is a
 * deliberate temporary state: to publish an official photo, replace the art
 * with <img class="clinic-media-img" src="…" alt="…"> and drop the label.
 */
function createClinicMedia({ ratio, monogram = '', photo = null, alt = '', label = MEDIA_LABEL }) {
  const figure = element('figure', 'clinic-media');
  figure.dataset.ratio = ratio;
  const frame = element('div', 'clinic-media-frame');
  if (photo) {
    const image = element('img', 'clinic-media-img');
    image.src = photo;
    image.alt = alt;
    image.loading = 'lazy';
    image.decoding = 'async';
    frame.append(image);
  } else {
    const art = element('img', 'clinic-media-img clinic-media-art');
    art.src = mediaArtUrl;
    art.alt = '';
    art.setAttribute('aria-hidden', 'true');
    frame.append(art);
    if (monogram) {
      const mark = element('span', 'clinic-media-monogram font-display', monogram);
      mark.setAttribute('aria-hidden', 'true');
      frame.append(mark);
    }
    frame.append(element('span', 'clinic-media-label', label));
  }
  figure.append(frame);
  return figure;
}

/** Native modal behavior supplies focus containment and Escape support. */
function createDialog(id, title, extraClass = '') {
  const dialog = element('dialog', `modal-card font-body ${extraClass}`.trim());
  dialog.id = id;
  const heading = element('div', 'modal-heading');
  const titleNode = element('h2', 'font-display', title);
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
  const cards = DENTISTS.map(doctor => {
    const card = element('article', 'doctor-card');
    const titleId = `doctor-${doctor.key}-title`;
    card.setAttribute('aria-labelledby', titleId);
    card.append(createClinicMedia({
      ratio: '4x5',
      monogram: doctor.initials,
      photo: doctorPhotoByKey[doctor.key] || null,
      alt: `Foto ${doctor.name}, ${doctor.role} di Hade Medika Cicurug`,
    }));
    const info = element('div', 'doctor-info');
    const role = element('p', 'doctor-role', doctor.role);
    const title = element('h3', 'font-display', doctor.name);
    title.id = titleId;
    const schedule = element('ul', 'doctor-schedule');
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
    info.append(role, title, schedule, bookButton);
    card.append(info);
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
    ['Nama pasien', booking.name],
    ['Nomor WhatsApp', booking.wa],
    ['Kebutuhan perawatan', SERVICES[booking.service]],
    ['Preferensi dokter', getDoctorLabel(booking.doctorKey)],
    ['Tanggal yang diinginkan', formatBookingDate(booking.date)],
    ['Preferensi waktu', TIME_PREFERENCES[booking.time]],
    ['Catatan singkat', booking.notes || 'Tidak ada catatan'],
  ];
  rows.forEach(([label, value]) => {
    const row = element('div', 'modal-summary-row');
    row.append(element('dt', '', label), element('dd', '', value));
    summary.append(row);
  });
  bookingDialog.body.replaceChildren(
    element('p', '', 'Periksa ringkasan ini. Jadwal belum dikonfirmasi dan data belum terkirim.'),
    summary,
    element('p', 'text-sm', 'Data pada formulir, termasuk catatan Anda, hanya diteruskan ke WhatsApp setelah Anda menekan tautan di bawah dan mengirim pesannya.'),
  );
  const waUrl = buildWhatsAppUrl(booking);
  const waLink = element('a', 'btn-primary text-sm', 'Lanjutkan ke WhatsApp');
  waLink.href = waUrl;
  waLink.target = '_blank';
  waLink.rel = 'noopener noreferrer';
  waLink.addEventListener('click', () => showHandoff(booking, waUrl));
  bookingDialog.actions.replaceChildren(waLink);
  bookingDialog.open();
}

function showHandoff(booking, waUrl) {
  const successOutput = document.getElementById('booking-success');
  if (successOutput) {
    successOutput.textContent = 'Permintaan kunjungan sudah disiapkan di WhatsApp. Kirim pesan di sana, lalu tunggu konfirmasi admin.';
  }
  if (!bookingDialog) return;
  bookingDialog.title.textContent = 'Permintaan siap dikirim';
  bookingDialog.body.replaceChildren(
    element('p', 'handoff-lead font-display', 'Pesan permintaan Anda sudah disiapkan di WhatsApp.'),
    element('p', '', `Jadwal untuk ${booking.name} belum pasti. Kirim pesan yang sudah tertulis di WhatsApp, lalu tunggu balasan admin yang mengonfirmasi dokter, tanggal, dan jam kunjungan.`),
    element('p', 'text-sm', 'WhatsApp terbuka di tab baru. Jika tidak terbuka, gunakan tombol “Buka WhatsApp lagi” di bawah.'),
  );
  const reopen = element('a', 'btn-primary text-sm', 'Buka WhatsApp lagi');
  reopen.href = waUrl;
  reopen.target = '_blank';
  reopen.rel = 'noopener noreferrer';
  const close = element('button', 'btn-secondary text-sm', 'Tutup ringkasan');
  close.type = 'button';
  close.addEventListener('click', () => bookingDialog.close());
  bookingDialog.actions.replaceChildren(reopen, close);
}

function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;
  // Never allow a partial integration to submit patient data in a URL.
  form.addEventListener('submit', event => event.preventDefault());
  form.noValidate = true;
  const errorOutput = document.getElementById('booking-error');
  const successOutput = document.getElementById('booking-success');
  const fields = Object.fromEntries(
    ['name', 'wa', 'service', 'doctor', 'date', 'time', 'notes', 'consent']
      .map(id => [id, form.querySelector(`#${id}`)]),
  );
  if (Object.values(fields).some(field => !field)) {
    if (errorOutput) errorOutput.textContent = 'Formulir belum lengkap. Silakan hubungi admin melalui WhatsApp.';
    return;
  }
  const fieldErrors = new Map();
  const describe = (field, id) => {
    const ids = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    ids.add(id);
    field.setAttribute('aria-describedby', [...ids].join(' '));
  };
  if (errorOutput) {
    errorOutput.tabIndex = -1;
    Object.values(fields).forEach(field => describe(field, errorOutput.id));
  }
  function showFieldError(field, message) {
    let node = fieldErrors.get(field);
    if (!node) {
      node = element('p', 'field-error');
      node.id = `${field.id}-error`;
      field.closest('div')?.append(node);
      fieldErrors.set(field, node);
      describe(field, node.id);
    }
    node.textContent = message;
    field.setAttribute('aria-invalid', 'true');
  }
  function clearErrors() {
    fieldErrors.forEach(node => { node.textContent = ''; });
    Object.values(fields).forEach(field => field.removeAttribute('aria-invalid'));
    if (errorOutput) errorOutput.textContent = '';
    if (successOutput) successOutput.textContent = '';
  }
  const refreshDateBounds = () => { fields.date.min = getJakartaToday(); };
  form.addEventListener('input', clearErrors);
  form.addEventListener('change', clearErrors);
  form.addEventListener('focusin', event => {
    if (event.target === fields.date) refreshDateBounds();
  });
  refreshDateBounds();

  form.addEventListener('submit', () => {
    clearErrors();
    refreshDateBounds();
    const result = validateBooking({
      name: fields.name.value, wa: fields.wa.value, service: fields.service.value,
      doctorKey: fields.doctor.value, date: fields.date.value, time: fields.time.value,
      notes: fields.notes.value, consent: fields.consent.checked,
    });
    if (!result.valid) {
      result.errors.forEach(error => {
        const field = fields[error.field];
        if (field) showFieldError(field, error.message);
      });
      if (errorOutput) errorOutput.textContent = 'Lengkapi bagian yang ditandai sebelum meninjau permintaan.';
      const first = fields[result.errors[0].field];
      (first ?? errorOutput)?.focus();
      return;
    }
    fields.name.value = result.booking.name;
    fields.wa.value = result.booking.wa;
    showBookingSummary(result.booking);
  });
}

const SERVICE_EXAM_NOTE = 'Tindakan akhir ditentukan bersama dokter setelah pemeriksaan. Informasi ini bersifat umum, bukan diagnosis atau jaminan hasil.';

const serviceDetails = {
  konsultasi: {
    title: 'Pemeriksaan & Konsultasi Dokter Gigi',
    description: 'Pemeriksaan untuk memahami kondisi gigi dan mulut, lalu mendiskusikan pilihan perawatan bersama dokter dengan bahasa yang mudah dipahami.',
    forWhom: [
      'Belum pernah memeriksakan gigi dan ingin tahu kondisi saat ini.',
      'Mengalami keluhan seperti nyeri, gusi berdarah, atau gigi sensitif.',
      'Ingin merencanakan pemeriksaan rutin untuk diri sendiri atau keluarga.',
    ],
  },
  scaling: {
    title: 'Scaling / Pembersihan Karang Gigi',
    description: 'Pembersihan plak dan karang gigi dengan alat khusus. Kebutuhan dan cara pembersihan ditentukan setelah dokter memeriksa kondisi gigi dan gusi.',
    forWhom: [
      'Gusi mudah berdarah atau terasa tidak nyaman saat menyikat gigi.',
      'Terlihat plak atau karang gigi yang ingin dibersihkan.',
      'Ingin menjaga kebersihan mulut melalui pemeriksaan berkala.',
    ],
  },
  tambal: {
    title: 'Tambal Gigi',
    description: 'Penambalan gigi untuk memperbaiki kerusakan seperti gigi berlubang. Pilihan bahan dan cara penanganan dibahas setelah pemeriksaan.',
    forWhom: [
      'Gigi terasa ngilu saat makan atau minum.',
      'Terlihat lubang, retakan, atau bagian gigi yang terkikis.',
      'Baru melepas tambalan lama dan ingin menilai kondisinya.',
    ],
  },
  cabut: {
    title: 'Cabut Gigi & Bedah Minor',
    description: 'Pencabutan gigi dipertimbangkan bila gigi tidak dapat dipertahankan lagi. Dokter menilai kondisi gigi dan jaringan sekitarnya sebelum menentukan tindakan.',
    forWhom: [
      'Gigi goyang atau rusak berat dan menimbulkan keluhan.',
      'Gigi bungsu atau sisa akar yang perlu dinilai dokter.',
      'Nyeri atau pembengkakan yang mengganggu aktivitas sehari-hari.',
    ],
  },
  anak: {
    title: 'Perawatan Gigi Anak (Pedodonti)',
    description: 'Pemeriksaan gigi anak dan edukasi kebersihan mulut yang disesuaikan dengan usia, kebutuhan, serta kesiapan anak.',
    forWhom: [
      'Anak yang baru pertama kali akan berkunjung ke dokter gigi.',
      'Muncul keluhan seperti gigi berlubang atau nyeri pada anak.',
      'Orang tua yang ingin mempelajari cara merawat gigi anak di rumah.',
    ],
  },
  veneer: {
    title: 'Perawatan Estetik, Bleaching & Veneer',
    description: 'Konsultasi mengenai tampilan gigi — warna, bentuk, dan kerapian. Dokter memeriksa kondisi gigi dan gusi sebelum membahas pilihan perawatan estetik.',
    forWhom: [
      'Ingin memperbaiki warna atau bentuk tampilan gigi.',
      'Mempertimbangkan perawatan estetik dan ingin memahami indikasi serta risikonya.',
      'Ingin tahu pilihan pemeliharaan setelah perawatan estetik.',
    ],
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
      item.forWhom.forEach(point => list.append(element('li', '', point)));
      modal.body.replaceChildren(
        element('p', '', item.description),
        element('h3', 'font-display', 'Siapa yang perlu berkonsultasi'),
        list,
        element('p', 'modal-note text-sm', SERVICE_EXAM_NOTE),
      );
      const book = element('button', 'btn-primary text-sm', 'Ajukan Kunjungan');
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
  initBookingForm();
  initServiceModals();
  initFaqAccordion();
  initScrollReveals();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

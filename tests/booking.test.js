import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DOCTORS, getDoctor } from '../assets/js/clinic-data.js';
import {
  CLINIC_WHATSAPP, SERVICES, TIME_PREFERENCES, TIME_ZONE, buildWhatsAppMessage,
  buildWhatsAppUrl, formatBookingDate, getDoctorLabel, getJakartaToday,
  isBookableDate, isValidDate, normalizeIndonesianPhone, validateBooking,
} from '../assets/js/booking.js';

const NOW = new Date('2026-10-01T00:00:00Z');
const MONDAY = '2026-10-19';

const baseInput = {
  name: '  Pasien Contoh  ', wa: '0812-3456-7890', service: 'konsultasi',
  doctorKey: 'isna', date: MONDAY, time: 'pagi', notes: '  Ingin konsultasi  ', consent: true,
};

const DENTIST_KEYS = ['eka', 'hanif', 'irsyad', 'firda', 'linni', 'shania', 'isna'];
const GENERAL_KEYS = ['hamidi', 'kirei'];

test('roster carries the whole clinic team with honest roles and no invented profiles', () => {
  assert.deepEqual(DOCTORS.map(doctor => doctor.key), [...DENTIST_KEYS, ...GENERAL_KEYS, 'nadelia']);
  for (const doctor of DOCTORS) {
    assert.ok(doctor.initials);
    assert.ok(doctor.scheduleLabels.length);
    assert.ok(doctor.scheduleLabels.every(label => typeof label === 'string' && label.trim().length > 0));
    assert.ok(doctor.scheduleLabels.some(label => label.includes('WIB')), `${doctor.key} needs a WIB schedule`);
    for (const absent of ['sip', 'quote', 'photo', 'bio', 'rating']) {
      assert.ok(!Object.hasOwn(doctor, absent));
    }
  }
  for (const key of DENTIST_KEYS) {
    const doctor = getDoctor(key);
    assert.equal(doctor.role, 'Dokter Gigi');
    assert.equal(doctor.name, `drg. ${key[0].toUpperCase()}${key.slice(1)}`);
    assert.ok(doctor.scheduleLabels.every(label => label.includes('WIB')));
  }
  for (const key of GENERAL_KEYS) {
    const doctor = getDoctor(key);
    assert.equal(doctor.role, 'Dokter Umum');
    assert.equal(doctor.name, `dr. ${key[0].toUpperCase()}${key.slice(1)}`);
  }
  assert.equal(getDoctor('nadelia').role, 'Dokter Estetika');
  assert.equal(getDoctor('nadelia').name, 'dr. Nadelia');
  assert.equal(getDoctor('unknown'), undefined);
});

test('general and aesthetic schedules keep the clinic poster wording', () => {
  assert.deepEqual(getDoctor('hamidi').scheduleLabels, ['Senin–Sabtu · 08:00–20:00 WIB']);
  assert.deepEqual(getDoctor('kirei').scheduleLabels, ['Minggu · 08:00–18:00 WIB']);
  assert.deepEqual(getDoctor('nadelia').scheduleLabels, ['Senin–Sabtu · 13:00–17:00 WIB', 'Minggu · By Appointment']);
});

test('Sunday labels stay concise while retaining the admin-confirmation requirement', () => {
  for (const [key, recurrence] of [['shania', 'kedua'], ['isna', 'keempat']]) {
    const doctor = getDoctor(key);
    assert.equal(doctor.scheduleLabels.at(-1), `Minggu · 08:00–18:00 WIB (minggu ${recurrence}; konfirmasi admin)`);
  }
});

test('Jakarta date is independent of the machine time zone', () => {
  assert.equal(TIME_ZONE, 'Asia/Jakarta');
  assert.equal(getJakartaToday(new Date('2026-10-18T16:59:00Z')), '2026-10-18');
  assert.equal(getJakartaToday(new Date('2026-10-18T17:00:00Z')), MONDAY);
  assert.equal(getJakartaToday(new Date('2026-12-31T17:00:00Z')), '2027-01-01');
});

test('date bounds allow local today, reject local yesterday, and allow future dates', () => {
  const midnight = new Date('2026-10-18T17:00:00Z');
  assert.equal(isBookableDate('2026-10-18', midnight), false);
  assert.equal(isBookableDate(MONDAY, midnight), true);
  assert.equal(isBookableDate('2026-10-20', midnight), true);
});

test('strict date parsing rejects malformed and impossible dates', () => {
  for (const value of ['', undefined, null, '2026-2-01', '2026-02-29', '2026-04-31', '2026-13-01', 'not-a-date', '2026-10-19T00:00:00Z']) {
    assert.equal(isValidDate(value), false, String(value));
    assert.equal(isBookableDate(value, NOW), false, String(value));
  }
  assert.equal(isValidDate('2028-02-29'), true);
  assert.match(formatBookingDate(MONDAY), /Senin/);
});

test('an untouched date field never validates as booked', () => {
  const result = validateBooking({ ...baseInput, date: '' }, NOW);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.field === 'date'));
});

test('past dates are rejected as Jakarta time moves on', () => {
  const result = validateBooking({ ...baseInput, date: '2026-09-30' }, NOW);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.field === 'date'));
});

test('Indonesian WhatsApp normalization accepts local/international numbers with spaces and dashes', () => {
  for (const value of ['081234567890', ' 0812-3456-7890 ', '+62 812-3456-7890', '6281234567890', '62-812-3456-7890']) {
    assert.equal(normalizeIndonesianPhone(value), '+6281234567890');
  }
});

test('Indonesian WhatsApp normalization rejects malformed, implausible, or foreign numbers', () => {
  for (const value of ['', undefined, 81234567890, '+1 81234567890', '+08 1234567890', '02112345678', '08123', '0812345678901234', '0812abc567890', '0812/3456/7890', '++6281234567890', '6281234567890?x=1']) {
    assert.equal(normalizeIndonesianPhone(value), null, String(value));
  }
});

test('valid booking trims text, normalizes phone, and preserves the chosen preferences', () => {
  const result = validateBooking(baseInput, NOW);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.booking.name, 'Pasien Contoh');
  assert.equal(result.booking.wa, '+6281234567890');
  assert.equal(result.booking.notes, 'Ingin konsultasi');
  assert.equal(result.booking.doctorKey, 'isna');
  assert.equal(result.booking.time, 'pagi');
});

test('blank names, invalid phones, unapproved consent, and missing selections fail inline validation', () => {
  for (const [field, value, errorField] of [
    ['name', '  ', 'name'], ['wa', 'invalid', 'wa'], ['consent', false, 'consent'],
    ['consent', 'true', 'consent'], ['doctorKey', undefined, 'doctor'], ['service', '', 'service'],
    ['time', '', 'time'], ['time', 'malam', 'time'],
  ]) {
    const result = validateBooking({ ...baseInput, [field]: value }, NOW);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.field === errorField));
  }
});

test('services, doctors, and time preferences use explicit allowlists, including prototype keys', () => {
  assert.deepEqual(Object.keys(SERVICES), ['konsultasi', 'scaling', 'tambal', 'cabut', 'anak', 'veneer', 'unsure']);
  assert.deepEqual(Object.keys(TIME_PREFERENCES), ['pagi', 'siang', 'sore', 'fleksibel']);
  for (const key of ['fake', '__proto__', 'constructor', 'toString']) {
    assert.ok(validateBooking({ ...baseInput, service: key }, NOW).errors.some(error => error.field === 'service'));
    assert.ok(validateBooking({ ...baseInput, doctorKey: key }, NOW).errors.some(error => error.field === 'doctor'));
    assert.ok(validateBooking({ ...baseInput, time: key }, NOW).errors.some(error => error.field === 'time'));
  }
  for (const service of Object.keys(SERVICES)) assert.equal(validateBooking({ ...baseInput, service }, NOW).valid, true);
  for (const time of Object.keys(TIME_PREFERENCES)) assert.equal(validateBooking({ ...baseInput, time }, NOW).valid, true);
});

test('no-preference doctor stays explicit in the message instead of guessing a dentist', () => {
  const result = validateBooking({ ...baseInput, doctorKey: '', notes: '' }, NOW);
  assert.equal(result.valid, true);
  assert.match(buildWhatsAppMessage(result.booking), /Dokter pilihan: Dokter yang tersedia \(tanpa preferensi\)/);
  assert.match(buildWhatsAppMessage(result.booking), /Catatan \(opsional\): Tidak ada catatan/);
});

test('WhatsApp message carries every reviewed field without claiming confirmation', () => {
  const { booking } = validateBooking(baseInput, NOW);
  const message = buildWhatsAppMessage(booking);
  assert.match(message, /Nama: Pasien Contoh/);
  assert.match(message, /WhatsApp: \+6281234567890/);
  assert.match(message, /Layanan: Pemeriksaan & Konsultasi Dokter Gigi/);
  assert.match(message, /Dokter pilihan: drg\. Isna/);
  assert.match(message, /Tanggal yang diinginkan: Senin/);
  assert.match(message, /Preferensi waktu: Pagi/);
  assert.match(message, /Catatan \(opsional\): Ingin konsultasi/);
  assert.match(message, /bukan janji yang sudah dikonfirmasi/);
});

test('WhatsApp URL safely encodes notes, punctuation, Unicode, and newlines', () => {
  const { booking } = validateBooking({ ...baseInput, notes: 'Gigi & gusi? #catatan + 100%\nIngin tanya 😊 <b>teks</b>' }, NOW);
  const url = new URL(buildWhatsAppUrl(booking));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, `/${CLINIC_WHATSAPP}`);
  assert.equal(url.searchParams.get('text'), buildWhatsAppMessage(booking));
  assert.equal([...url.searchParams.keys()].length, 1);
  assert.equal(url.hash, '');
});

test('unknown doctor, service, or time labels throw instead of being silently mislabelled', () => {
  const { booking } = validateBooking(baseInput, NOW);
  assert.throws(() => getDoctorLabel('__proto__'), RangeError);
  assert.throws(() => buildWhatsAppMessage({ ...booking, service: '__proto__' }), RangeError);
  assert.throws(() => buildWhatsAppMessage({ ...booking, time: 'malam' }), RangeError);
});

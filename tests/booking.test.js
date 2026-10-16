import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DENTISTS, getDentist } from '../assets/js/clinic-data.js';
import {
  CLINIC_WHATSAPP, SERVICES, TIME_ZONE, buildWhatsAppMessage, buildWhatsAppUrl,
  formatBookingDate, getDoctorLabel, getJakartaNow, getScheduleAvailability,
  isBookableDate, isValidDate, normalizeIndonesianPhone, validateBooking,
} from '../assets/js/booking.js';

const NOW = new Date('2026-10-01T00:00:00Z');
const MONDAY = '2026-10-19';
const FRIDAY = '2026-10-23';
const SUNDAY = '2026-10-25';
const week = ['2026-10-18', MONDAY, '2026-10-20', '2026-10-21', '2026-10-22', FRIDAY, '2026-10-24'];
const availability = (doctorKey, date = MONDAY, now = NOW) => getScheduleAvailability({ doctorKey, date, now });

function times(start, end) {
  const minute = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const first = minute(start);
  return Array.from({ length: (minute(end) - first) / 30 }, (_, index) => {
    const value = first + index * 30;
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  });
}

const baseInput = {
  name: '  Pasien Contoh  ', wa: '0812-3456-7890', service: 'konsultasi',
  doctorKey: 'isna', date: MONDAY, slot: '19:30', notes: '  Ingin konsultasi  ', consent: true,
};

// Independent fixtures for every weekday, including off days and late evenings.
const posterWeek = {
  eka: { 1: ['12:00', '19:00'], 2: ['12:00', '19:00'], 3: ['08:00', '19:00'], 4: ['08:00', '19:00'], 6: ['08:00', '19:00'] },
  hanif: { 0: ['08:00', '18:00'], 1: ['08:00', '12:00'], 2: ['08:00', '12:00'], 4: ['08:00', '12:00'], 5: ['08:00', '12:00'], 6: ['08:00', '12:00'] },
  irsyad: { 1: ['14:00', '20:00'], 2: ['14:00', '20:00'], 3: ['14:00', '20:00'], 4: ['14:00', '20:00'], 5: ['14:00', '20:00'], 6: ['14:00', '20:00'] },
  firda: { 1: ['08:00', '12:00'], 2: ['08:00', '12:00'] },
  linni: { 0: ['08:00', '18:00'], 1: ['12:00', '14:00'], 2: ['12:00', '14:00'], 3: ['08:00', '14:00'], 4: ['12:00', '14:00'], 5: ['08:00', '16:00'] },
  shania: { 2: ['19:00', '21:00'], 4: ['19:00', '21:00'], 5: ['16:00', '20:00'], 6: ['19:00', '21:00'] },
  isna: { 1: ['19:00', '21:00'], 3: ['19:00', '21:00'], 5: ['12:30', '14:00'] },
};

for (const [key, schedule] of Object.entries(posterWeek)) {
  for (const [weekday, date] of week.entries()) {
    test(`${key}: poster start times on weekday ${weekday}`, () => {
      assert.deepEqual(availability(key, date).slots, schedule[weekday] ? times(...schedule[weekday]) : []);
    });
  }
}

test('roster contains only the seven supplied dentists, with honest roles and schedule labels', () => {
  assert.deepEqual(DENTISTS.map(doctor => doctor.key), ['eka', 'hanif', 'irsyad', 'firda', 'linni', 'shania', 'isna']);
  for (const doctor of DENTISTS) {
    assert.equal(doctor.role, 'Dokter Gigi');
    assert.equal(doctor.name, `drg. ${doctor.key[0].toUpperCase()}${doctor.key.slice(1)}`);
    assert.ok(doctor.initials);
    assert.ok(doctor.scheduleLabels.length);
    assert.ok(doctor.scheduleLabels.every(label => label.includes('WIB')));
    assert.ok(!Object.hasOwn(doctor, 'sip'));
    assert.ok(!Object.hasOwn(doctor, 'quote'));
  }
  assert.equal(getDentist('hamidi'), undefined);
  assert.equal(getDentist('kirei'), undefined);
  assert.equal(getDentist('nadelia'), undefined);
});

test('Sunday labels stay concise while retaining the admin-confirmation requirement', () => {
  for (const [key, recurrence] of [['shania', 'kedua'], ['isna', 'keempat']]) {
    const doctor = getDentist(key);
    assert.equal(doctor.scheduleLabels.at(-1), `Minggu · 08:00–18:00 WIB (minggu ${recurrence}; konfirmasi admin)`);
    const sunday = doctor.schedule.find(interval => interval.days.includes(0));
    assert.equal(sunday.requiresAdmin, true);
    assert.deepEqual(availability(key, SUNDAY).slots, []);
  }
});

test('Isna Friday midday starts at 12:30 and excludes the 14:00 end', () => {
  assert.deepEqual(availability('isna', FRIDAY).slots, ['12:30', '13:00', '13:30']);
});

test('any-dentist Monday union spans all real schedules, without duplicates', () => {
  const result = availability('');
  assert.deepEqual(result.slots, times('08:00', '21:00'));
  assert.equal(result.slots.length, new Set(result.slots).size);
  assert.match(result.note, /indikatif/);
  assert.match(result.note, /bukan ketersediaan langsung/);
  assert.match(result.note, /permintaan/);
});

test('Friday union is not restricted to invented global opening hours', () => {
  assert.deepEqual(availability('', FRIDAY).slots, times('08:00', '20:00'));
});

test('Sunday union contains confirmed Hanif/Linni times only and explains both conditional schedules', () => {
  const result = availability('', SUNDAY);
  assert.deepEqual(result.slots, times('08:00', '18:00'));
  assert.deepEqual(result.conditionalDoctors, ['shania', 'isna']);
  assert.match(result.note, /drg\. Shania dan drg\. Isna perlu konfirmasi admin/);
  assert.match(result.note, /tidak dimasukkan/);
  assert.ok(!result.slots.includes('18:00'));
});

test('ambiguous Sunday recurrences are never inferred, even on second/fourth Sundays', () => {
  for (const date of ['2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25']) {
    for (const key of ['shania', 'isna']) {
      const result = availability(key, date);
      assert.deepEqual(result.slots, []);
      assert.match(result.note, /konfirmasi admin/);
      assert.match(result.note, /hubungi admin/);
    }
  }
});

test('off day has no fallback slots and asks the patient to contact admin', () => {
  const result = availability('eka', FRIDAY);
  assert.deepEqual(result.slots, []);
  assert.match(result.note, /Tidak ada jam/);
  assert.match(result.note, /hubungi admin/);
});

test('Sunday after confirmed hours does not manufacture conditional availability', () => {
  const result = availability('', SUNDAY, new Date('2026-10-25T11:00:00Z'));
  assert.deepEqual(result.slots, []);
  assert.match(result.note, /Shania/);
  assert.match(result.note, /Isna/);
});

test('same-day starts include the exact present instant, but exclude already elapsed starts', () => {
  const cases = [
    ['2026-10-19T00:59:59.999Z', '08:00'],
    ['2026-10-19T01:00:00.000Z', '08:00'],
    ['2026-10-19T01:00:00.001Z', '08:30'],
    ['2026-10-19T01:10:00.000Z', '08:30'],
    ['2026-10-19T05:45:00.000Z', '13:00'],
    ['2026-10-19T13:30:00.000Z', '20:30'],
  ];
  for (const [instant, expected] of cases) {
    assert.equal(availability('', MONDAY, new Date(instant)).slots[0], expected);
  }
  assert.deepEqual(availability('', MONDAY, new Date('2026-10-19T13:30:00.001Z')).slots, []);
});

test('Isna midday same-day filtering preserves the half-hour offset', () => {
  assert.deepEqual(availability('isna', FRIDAY, new Date('2026-10-23T05:31:00Z')).slots, ['13:00', '13:30']);
});

test('Jakarta clock crosses midnight at 17:00 UTC, independent of machine timezone', () => {
  assert.equal(TIME_ZONE, 'Asia/Jakarta');
  assert.deepEqual(getJakartaNow(new Date('2026-10-18T16:59:00Z')), { date: '2026-10-18', minutes: 1439 });
  assert.deepEqual(getJakartaNow(new Date('2026-10-18T17:00:00Z')), { date: MONDAY, minutes: 0 });
  assert.equal(getJakartaNow(new Date('2026-12-31T17:00:00Z')).date, '2027-01-01');
});

test('date bounds allow local today, reject local yesterday, and allow future dates', () => {
  const midnight = new Date('2026-10-18T17:00:00Z');
  assert.equal(isBookableDate('2026-10-18', midnight), false);
  assert.equal(isBookableDate(MONDAY, midnight), true);
  assert.equal(isBookableDate('2026-10-20', midnight), true);
  assert.deepEqual(availability('', '2026-10-18', midnight).slots, []);
  assert.equal(availability('hanif', MONDAY, midnight).slots[0], '08:00');
});

test('strict date parsing rejects malformed and impossible dates', () => {
  for (const value of ['', undefined, null, '2026-2-01', '2026-02-29', '2026-04-31', '2026-13-01', 'not-a-date', '2026-10-19T00:00:00Z']) {
    assert.equal(isValidDate(value), false, String(value));
    assert.deepEqual(getScheduleAvailability({ doctorKey: '', date: value, now: NOW }).slots, []);
  }
  assert.equal(isValidDate('2028-02-29'), true);
  assert.match(formatBookingDate(MONDAY), /Senin/);
});

test('unknown doctor keys cannot fall through to any-dentist availability', () => {
  for (const doctorKey of ['hamidi', 'Eka', '__proto__', 'constructor', 'toString', null]) {
    const result = availability(doctorKey);
    assert.equal(result.validDoctor, false);
    assert.deepEqual(result.slots, []);
    assert.match(result.note, /Pilih dokter/);
  }
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

test('valid booking trims name/notes, normalizes phone, and preserves the selected dentist', () => {
  const result = validateBooking(baseInput, NOW);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.booking.name, 'Pasien Contoh');
  assert.equal(result.booking.wa, '+6281234567890');
  assert.equal(result.booking.notes, 'Ingin konsultasi');
  assert.equal(result.booking.doctorKey, 'isna');
  assert.equal(result.booking.slot, '19:30');
});

test('blank names, invalid phones, unapproved consent, and missing selections fail inline validation', () => {
  for (const [field, value, errorField] of [
    ['name', '  ', 'name'], ['wa', 'invalid', 'wa'], ['consent', false, 'consent'],
    ['consent', 'true', 'consent'], ['doctorKey', undefined, 'doctor'], ['service', '', 'service'],
  ]) {
    const result = validateBooking({ ...baseInput, [field]: value }, NOW);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.field === errorField));
  }
});

test('services and doctors use explicit allowlists, including protection from prototype keys', () => {
  assert.deepEqual(Object.keys(SERVICES), ['konsultasi', 'scaling', 'tambal', 'cabut', 'anak', 'veneer', 'unsure']);
  for (const key of ['fake', '__proto__', 'constructor', 'toString']) {
    assert.ok(validateBooking({ ...baseInput, service: key }, NOW).errors.some(error => error.field === 'service'));
    assert.ok(validateBooking({ ...baseInput, doctorKey: key }, NOW).errors.some(error => error.field === 'doctor'));
  }
  for (const service of Object.keys(SERVICES)) assert.equal(validateBooking({ ...baseInput, service }, NOW).valid, true);
});

test('only offered slots may be requested; broad sessions, off-schedule times, and endpoints fail', () => {
  for (const slot of ['', 'pagi', '08:00', '19:15', '21:00', '<script>']) {
    const result = validateBooking({ ...baseInput, slot }, NOW);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.field === 'slot'));
  }
  assert.equal(validateBooking({ ...baseInput, doctorKey: '', slot: '08:00' }, NOW).valid, true);
});

test('stale slots are rejected on submission as Jakarta time advances', () => {
  const input = { ...baseInput, doctorKey: 'hanif', slot: '08:00' };
  assert.equal(validateBooking(input, new Date('2026-10-19T01:00:00Z')).valid, true);
  assert.equal(validateBooking(input, new Date('2026-10-19T01:00:01Z')).valid, false);
  assert.ok(validateBooking({ ...baseInput, date: '2026-09-30' }, NOW).errors.some(error => error.field === 'date'));
});

test('conditional Sunday selections cannot be booked through validation', () => {
  for (const doctorKey of ['shania', 'isna']) {
    const result = validateBooking({ ...baseInput, date: SUNDAY, doctorKey, slot: '08:00' }, NOW);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.field === 'slot'));
  }
});

test('WhatsApp message carries the chosen doctor and time without claiming confirmation', () => {
  const { booking } = validateBooking(baseInput, NOW);
  const message = buildWhatsAppMessage(booking);
  assert.match(message, /Dokter pilihan: drg\. Isna/);
  assert.match(message, /Jam yang diminta: 19:30 WIB/);
  assert.match(message, /bukan janji yang sudah dikonfirmasi/);
  assert.match(message, /Nama: Pasien Contoh/);
  assert.match(message, /WhatsApp: \+6281234567890/);
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

test('no-preference doctor is explicit in messages, and unknown labels are rejected', () => {
  const { booking } = validateBooking({ ...baseInput, doctorKey: '', notes: '' }, NOW);
  assert.match(buildWhatsAppMessage(booking), /Dokter pilihan: Dokter yang tersedia \(tanpa preferensi\)/);
  assert.match(buildWhatsAppMessage(booking), /Catatan \(opsional\): Tidak ada catatan/);
  assert.throws(() => getDoctorLabel('__proto__'), RangeError);
  assert.throws(() => buildWhatsAppMessage({ ...booking, service: '__proto__' }), RangeError);
});

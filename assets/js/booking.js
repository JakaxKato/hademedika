import { DENTISTS, getDentist } from './clinic-data.js';

export const TIME_ZONE = 'Asia/Jakarta';
export const CLINIC_WHATSAPP = '6281359599996';
export const SERVICES = Object.freeze({
  konsultasi: 'Pemeriksaan & Konsultasi Dokter Gigi',
  scaling: 'Scaling / Pembersihan Karang Gigi',
  tambal: 'Tambal Gigi',
  cabut: 'Cabut Gigi',
  anak: 'Perawatan Gigi Anak',
  veneer: 'Konsultasi Veneer / Perawatan Estetik',
  unsure: 'Belum yakin — konsultasi dahulu',
});

const jakartaClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

export function getJakartaNow(now = new Date()) {
  const parts = Object.fromEntries(jakartaClock.formatToParts(now).map(part => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
      + Number(parts.second) / 60 + now.getMilliseconds() / 60000,
  };
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isBookableDate(value, now = new Date()) {
  return isValidDate(value) && value >= getJakartaNow(now).date;
}

export function normalizeIndonesianPhone(value) {
  if (typeof value !== 'string' || !/^\+?[\d -]+$/.test(value.trim())) return null;
  const compact = value.trim().replace(/[ -]/g, '');
  const match = compact.match(/^(?:\+?62|0)(8[1-9]\d{7,10})$/);
  return match ? `+62${match[1]}` : null;
}

const toMinutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const toTime = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Thirty-minute request start times, not treatment durations or live vacancies. */
export function getScheduleAvailability({ date, doctorKey = '', now = new Date() } = {}) {
  const validDoctor = doctorKey === '' || Boolean(getDentist(doctorKey));
  const validDate = isBookableDate(date, now);
  const result = { slots: [], conditionalDoctors: [], validDoctor, validDate, note: '' };
  const disclaimer = 'Jadwal indikatif dari poster, bukan ketersediaan langsung. Jam yang dipilih adalah permintaan; admin perlu mengonfirmasi dokter dan waktu kunjungan.';
  if (!validDoctor || !validDate) {
    result.note = `${!validDoctor ? 'Pilih dokter yang tercantum.' : 'Pilih tanggal hari ini atau sesudahnya (WIB).'} ${disclaimer}`;
    return result;
  }

  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const clock = getJakartaNow(now);
  const selected = doctorKey === '' ? DENTISTS : [getDentist(doctorKey)];
  const slots = new Set();

  // Preserve the poster caveat on every Sunday; never infer ordinal Sundays.
  result.conditionalDoctors = DENTISTS.filter(doctor => doctor.schedule.some(
    interval => interval.requiresAdmin && interval.days.includes(weekday),
  )).map(doctor => doctor.key);

  for (const doctor of selected) {
    for (const interval of doctor.schedule) {
      if (!interval.days.includes(weekday) || interval.requiresAdmin) continue;
      for (let minute = toMinutes(interval.start); minute < toMinutes(interval.end); minute += 30) {
        if (date === clock.date && minute < clock.minutes) continue;
        slots.add(toTime(minute));
      }
    }
  }

  result.slots = [...slots].sort();
  const conditionalNote = result.conditionalDoctors.length
    ? ` Jadwal Minggu ${result.conditionalDoctors.map(key => getDentist(key).name).join(' dan ')} perlu konfirmasi admin karena keterangan minggu pada poster belum memastikan tanggal praktik; jadwal tersebut tidak dimasukkan ke pilihan jam.`
    : '';
  const unavailableNote = result.slots.length === 0
    ? ' Tidak ada jam yang dapat diminta untuk pilihan ini. Pilih dokter/tanggal lain atau hubungi admin melalui WhatsApp.'
    : '';
  result.note = disclaimer + conditionalNote + unavailableNote;
  return result;
}

const text = value => typeof value === 'string' ? value.trim() : '';

export function validateBooking(input = {}, now = new Date()) {
  const booking = {
    name: text(input.name),
    wa: normalizeIndonesianPhone(input.wa),
    service: text(input.service),
    doctorKey: typeof input.doctorKey === 'string' ? input.doctorKey : null,
    date: text(input.date),
    slot: text(input.slot),
    notes: text(input.notes),
    consent: input.consent === true,
  };
  const errors = [];
  if (!booking.name) errors.push({ field: 'name', message: 'Isi nama pasien.' });
  if (!booking.wa) errors.push({ field: 'wa', message: 'Isi nomor WhatsApp Indonesia yang valid, misalnya 0812-3456-7890 atau +62 812-3456-7890.' });
  if (!Object.hasOwn(SERVICES, booking.service)) errors.push({ field: 'service', message: 'Pilih layanan yang tercantum.' });
  const availability = getScheduleAvailability({ date: booking.date, doctorKey: booking.doctorKey, now });
  if (!availability.validDoctor) errors.push({ field: 'doctor', message: 'Pilih dokter yang tercantum atau tanpa preferensi dokter.' });
  if (!availability.validDate) errors.push({ field: 'date', message: 'Pilih tanggal yang valid, mulai hari ini menurut waktu Jakarta (WIB).' });
  if (!availability.slots.includes(booking.slot)) errors.push({ field: 'slot', message: availability.slots.length ? 'Pilih jam dari jadwal yang tersedia untuk diminta.' : 'Tidak ada jam yang dapat diminta. Pilih dokter/tanggal lain atau hubungi admin.' });
  if (!booking.consent) errors.push({ field: 'consent', message: 'Setujui pengiriman data melalui WhatsApp sebelum melanjutkan.' });
  return { valid: errors.length === 0, errors, booking, availability };
}

export function formatBookingDate(date) {
  if (!isValidDate(date)) return '';
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

export function getDoctorLabel(doctorKey) {
  if (doctorKey === '') return 'Dokter yang tersedia (tanpa preferensi)';
  const doctor = getDentist(doctorKey);
  if (!doctor) throw new RangeError('Unknown dentist');
  return doctor.name;
}

export function buildWhatsAppMessage(booking) {
  if (!Object.hasOwn(SERVICES, booking.service)) throw new RangeError('Unknown service');
  return [
    'Halo Admin Hade Medika Cicurug,',
    'Saya ingin mengajukan permintaan kunjungan perawatan gigi:',
    '',
    `Nama: ${booking.name}`,
    `WhatsApp: ${booking.wa}`,
    `Layanan: ${SERVICES[booking.service]}`,
    `Dokter pilihan: ${getDoctorLabel(booking.doctorKey)}`,
    `Tanggal: ${formatBookingDate(booking.date)}`,
    `Jam yang diminta: ${booking.slot} WIB`,
    `Catatan (opsional): ${booking.notes || 'Tidak ada catatan'}`,
    '',
    'Ini permintaan jadwal, bukan janji yang sudah dikonfirmasi. Mohon konfirmasi dokter dan waktu kunjungan. Terima kasih.',
  ].join('\n');
}

export function buildWhatsAppUrl(booking) {
  return `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(buildWhatsAppMessage(booking))}`;
}

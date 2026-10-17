import { getDoctor } from './clinic-data.js';

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

/** Broad time-of-day preferences only. The exact hour is confirmed by admin. */
export const TIME_PREFERENCES = Object.freeze({
  pagi: 'Pagi',
  siang: 'Siang',
  sore: 'Sore',
  fleksibel: 'Fleksibel — mengikuti saran admin',
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

/** Today's date in Jakarta, independent of the machine time zone. */
export function getJakartaToday(now = new Date()) {
  const parts = Object.fromEntries(jakartaClock.formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isBookableDate(value, now = new Date()) {
  return isValidDate(value) && value >= getJakartaToday(now);
}

export function normalizeIndonesianPhone(value) {
  if (typeof value !== 'string' || !/^\+?[\d -]+$/.test(value.trim())) return null;
  const compact = value.trim().replace(/[ -]/g, '');
  const match = compact.match(/^(?:\+?62|0)(8[1-9]\d{7,10})$/);
  return match ? `+62${match[1]}` : null;
}

const text = value => typeof value === 'string' ? value.trim() : '';

export function validateBooking(input = {}, now = new Date()) {
  const booking = {
    name: text(input.name),
    wa: normalizeIndonesianPhone(input.wa),
    service: text(input.service),
    doctorKey: typeof input.doctorKey === 'string' ? input.doctorKey : null,
    date: text(input.date),
    time: text(input.time),
    notes: text(input.notes),
    consent: input.consent === true,
  };
  const validDoctor = booking.doctorKey === '' || Boolean(getDoctor(booking.doctorKey));
  const errors = [];
  if (!booking.name) errors.push({ field: 'name', message: 'Isi nama pasien.' });
  if (!booking.wa) errors.push({ field: 'wa', message: 'Isi nomor WhatsApp Indonesia yang valid, misalnya 0812-3456-7890 atau +62 812-3456-7890.' });
  if (!Object.hasOwn(SERVICES, booking.service)) errors.push({ field: 'service', message: 'Pilih layanan yang tercantum.' });
  if (!validDoctor) errors.push({ field: 'doctor', message: 'Pilih dokter yang tercantum atau tanpa preferensi dokter.' });
  if (!isBookableDate(booking.date, now)) errors.push({ field: 'date', message: 'Pilih tanggal kunjungan, mulai hari ini menurut waktu Jakarta (WIB).' });
  if (!Object.hasOwn(TIME_PREFERENCES, booking.time)) errors.push({ field: 'time', message: 'Pilih preferensi waktu kunjungan.' });
  if (!booking.consent) errors.push({ field: 'consent', message: 'Setujui pengiriman data melalui WhatsApp sebelum melanjutkan.' });
  return { valid: errors.length === 0, errors, booking };
}

export function formatBookingDate(date) {
  if (!isValidDate(date)) return '';
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

export function getDoctorLabel(doctorKey) {
  if (doctorKey === '') return 'Dokter yang tersedia (tanpa preferensi)';
  const doctor = getDoctor(doctorKey);
  if (!doctor) throw new RangeError('Unknown doctor');
  return doctor.name;
}

export function buildWhatsAppMessage(booking) {
  if (!Object.hasOwn(SERVICES, booking.service)) throw new RangeError('Unknown service');
  if (!Object.hasOwn(TIME_PREFERENCES, booking.time)) throw new RangeError('Unknown time preference');
  return [
    'Halo Admin Hade Medika Cicurug,',
    'Saya ingin mengajukan permintaan kunjungan:',
    '',
    `Nama: ${booking.name}`,
    `WhatsApp: ${booking.wa}`,
    `Layanan: ${SERVICES[booking.service]}`,
    `Dokter pilihan: ${getDoctorLabel(booking.doctorKey)}`,
    `Tanggal yang diinginkan: ${formatBookingDate(booking.date)}`,
    `Preferensi waktu: ${TIME_PREFERENCES[booking.time]}`,
    `Catatan (opsional): ${booking.notes || 'Tidak ada catatan'}`,
    '',
    'Jam pasti belum ditentukan dan akan dikonfirmasi oleh admin. Ini permintaan jadwal, bukan janji yang sudah dikonfirmasi. Terima kasih.',
  ].join('\n');
}

export function buildWhatsAppUrl(booking) {
  return `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(buildWhatsAppMessage(booking))}`;
}

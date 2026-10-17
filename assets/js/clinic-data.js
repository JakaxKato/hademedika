/** Clinic team transcribed from the clinic's own poster material.
 * The labels below are the only schedule info shown in the UI; the exact
 * date, time, and doctor availability are always confirmed by the admin.
 */
export const DOCTORS = [
  {
    key: 'eka',
    name: 'drg. Eka',
    initials: 'E',
    role: 'Dokter Gigi',
    scheduleLabels: [
      'Senin & Selasa · 12:00–19:00 WIB',
      'Rabu, Kamis & Sabtu · 08:00–19:00 WIB',
    ],
  },
  {
    key: 'hanif',
    name: 'drg. Hanif',
    initials: 'H',
    role: 'Dokter Gigi',
    scheduleLabels: [
      'Senin, Selasa, Kamis, Jumat & Sabtu · 08:00–12:00 WIB',
      'Minggu · 08:00–18:00 WIB',
    ],
  },
  {
    key: 'irsyad',
    name: 'drg. Irsyad',
    initials: 'I',
    role: 'Dokter Gigi',
    scheduleLabels: ['Senin–Sabtu · 14:00–20:00 WIB'],
  },
  {
    key: 'firda',
    name: 'drg. Firda',
    initials: 'F',
    role: 'Dokter Gigi',
    scheduleLabels: ['Senin & Selasa · 08:00–12:00 WIB'],
  },
  {
    key: 'linni',
    name: 'drg. Linni',
    initials: 'L',
    role: 'Dokter Gigi',
    scheduleLabels: [
      'Senin, Selasa & Kamis · 12:00–14:00 WIB',
      'Rabu · 08:00–14:00 WIB',
      'Jumat · 08:00–16:00 WIB',
      'Minggu · 08:00–18:00 WIB',
    ],
  },
  {
    key: 'shania',
    name: 'drg. Shania',
    initials: 'S',
    role: 'Dokter Gigi',
    scheduleLabels: [
      'Selasa, Kamis & Sabtu · 19:00–21:00 WIB',
      'Jumat · 16:00–20:00 WIB',
      'Minggu · 08:00–18:00 WIB (minggu kedua; konfirmasi admin)',
    ],
  },
  {
    key: 'isna',
    name: 'drg. Isna',
    initials: 'I',
    role: 'Dokter Gigi',
    scheduleLabels: [
      'Senin & Rabu · 19:00–21:00 WIB',
      'Jumat · 12:30–14:00 WIB',
      'Minggu · 08:00–18:00 WIB (minggu keempat; konfirmasi admin)',
    ],
  },
  {
    key: 'hamidi',
    name: 'dr. Hamidi',
    initials: 'H',
    role: 'Dokter Umum',
    scheduleLabels: ['Senin–Sabtu · 08:00–20:00 WIB'],
  },
  {
    key: 'kirei',
    name: 'dr. Kirei',
    initials: 'K',
    role: 'Dokter Umum',
    scheduleLabels: ['Minggu · 08:00–18:00 WIB'],
  },
  {
    key: 'nadelia',
    name: 'dr. Nadelia',
    initials: 'N',
    role: 'Dokter Estetika',
    scheduleLabels: [
      'Senin–Sabtu · 13:00–17:00 WIB',
      'Minggu · By Appointment',
    ],
  },
];

export function getDoctor(key) {
  return DOCTORS.find(doctor => doctor.key === key);
}

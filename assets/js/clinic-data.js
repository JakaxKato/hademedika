/** Dental schedules transcribed from the supplied posters; not live availability.
 * Weekdays use JavaScript numbering: Sunday = 0, Monday = 1, … Saturday = 6.
 * The two ambiguous Sunday recurrences deliberately require admin confirmation.
 */
export const DENTISTS = [
  {
    key: 'eka',
    name: 'drg. Eka',
    initials: 'E',
    role: 'Dokter Gigi',
    schedule: [
      { days: [1, 2], start: '12:00', end: '19:00' },
      { days: [3, 4, 6], start: '08:00', end: '19:00' },
    ],
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
    schedule: [
      { days: [1, 2, 4, 5, 6], start: '08:00', end: '12:00' },
      { days: [0], start: '08:00', end: '18:00' },
    ],
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
    schedule: [
      { days: [1, 2, 3, 4, 5, 6], start: '14:00', end: '20:00' },
    ],
    scheduleLabels: ['Senin–Sabtu · 14:00–20:00 WIB'],
  },
  {
    key: 'firda',
    name: 'drg. Firda',
    initials: 'F',
    role: 'Dokter Gigi',
    schedule: [
      { days: [1, 2], start: '08:00', end: '12:00' },
    ],
    scheduleLabels: ['Senin & Selasa · 08:00–12:00 WIB'],
  },
  {
    key: 'linni',
    name: 'drg. Linni',
    initials: 'L',
    role: 'Dokter Gigi',
    schedule: [
      { days: [1, 2, 4], start: '12:00', end: '14:00' },
      { days: [3], start: '08:00', end: '14:00' },
      { days: [5], start: '08:00', end: '16:00' },
      { days: [0], start: '08:00', end: '18:00' },
    ],
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
    schedule: [
      { days: [2, 4, 6], start: '19:00', end: '21:00' },
      { days: [5], start: '16:00', end: '20:00' },
      { days: [0], start: '08:00', end: '18:00', requiresAdmin: true },
    ],
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
    schedule: [
      { days: [1, 3], start: '19:00', end: '21:00' },
      { days: [5], start: '12:30', end: '14:00' },
      { days: [0], start: '08:00', end: '18:00', requiresAdmin: true },
    ],
    scheduleLabels: [
      'Senin & Rabu · 19:00–21:00 WIB',
      'Jumat · 12:30–14:00 WIB',
      'Minggu · 08:00–18:00 WIB (minggu keempat; konfirmasi admin)',
    ],
  },
];

export function getDentist(key) {
  return DENTISTS.find(doctor => doctor.key === key);
}

// Publish only real, source-linked reviews with explicit approval.
export const PATIENT_REVIEWS = [];

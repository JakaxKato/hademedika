# Hade Medika Cicurug — pratinjau website layanan gigi

Website statis dengan Vite, Tailwind CSS 3 yang dikompilasi saat build,
JavaScript modular, serta tipografi Newsreader dan Manrope. Nuansa krem dan
hijau dibuat senada dengan materi dokter yang diberikan, tanpa mengubah warna
atau wajah pada poster.

**Status:** demo penawaran, bukan sistem manajemen pasien atau reservasi otomatis.
Konten final, izin publikasi, harga, dan informasi praktik harus disetujui klinik.

## Menjalankan

Gunakan Node.js 22 atau lebih baru.

```sh
npm ci
npm run dev
```

Buka alamat yang ditampilkan Vite. Jangan membuka `index.html` dengan `file://`:
modul JavaScript, pemuatan aset, dan CSS membutuhkan dev server / hasil build.

```sh
npm run build
npm run preview
```

Deploy isi `dist/` ke hosting statis dengan HTTPS. Tidak ada backend, database,
API key, atau WhatsApp Business API yang dibutuhkan untuk versi ini.

## Yang sudah tersedia

- Tujuh dokter gigi beserta jadwal dari materi poster: drg. Eka, Hanif, Irsyad,
  Firda, Linni, Shania, dan Isna. Data di `assets/js/clinic-data.js`.
- Pilihan dokter pada kartu terhubung ke formulir. Pilihan jam mengikuti jadwal
  dokter, dengan interval mulai 30 menit. Ini **bukan durasi tindakan** dan
  **bukan informasi slot kosong**.
- Hari ini dihitung menurut `Asia/Jakarta`, bukan zona waktu perangkat. Jam
  yang sudah berlalu tidak bisa dipilih.
- Jadwal Minggu drg. Shania (minggu kedua) dan drg. Isna (minggu keempat)
  ditampilkan sebagai jadwal yang perlu konfirmasi. Tidak ditebak sebagai
  tanggal tertentu dan tidak dimasukkan ke opsi jam otomatis.
- Ringkasan permintaan sebelum membuka WhatsApp. Nama dokter dan waktu ikut
  dalam pesan. Pengguna tetap perlu mengirim pesan dan menunggu konfirmasi admin.
- Persetujuan pengiriman data, validasi nomor WhatsApp, catatan opsional,
  informasi privasi, dan kesalahan formulir yang dapat dibaca screen reader.
- Embed Google Maps interaktif, tautan rute, Instagram berdasarkan handle pada
  poster, favicon SVG/PNG, serta ikon sentuh Apple.
- Informasi biaya per layanan dengan tombol WhatsApp khusus, tanpa tarif rekaan.
- Pratinjau galeri dengan pembesaran gambar dan label ilustrasi yang eksplisit.
- Dukungan banyak testimoni bersumber, tanpa mengarang ulasan atau rating.
- Dialog native dengan Escape/fokus keyboard, menu dan FAQ dengan status ARIA,
  serta animasi scroll ringan yang menghormati `prefers-reduced-motion`.
- Konten tetap terlihat ketika JavaScript/IntersectionObserver tidak tersedia.

## Foto dokter: masih perlu file asli

Gambar yang dilampirkan dalam chat belum tersedia sebagai file proyek.
Letakkan poster asli di `assets/images/doctors/`:

```text
drg-eka.jpg
drg-hanif.jpg
drg-irsyad.jpg
drg-firda.jpg
drg-linni.jpg
drg-shania.jpg
drg-isna.jpg
```

Ekstensi `.jpeg`, `.png`, dan `.webp` juga didukung. Lihat
`assets/images/doctors/README.md` untuk aturan penamaan. Pemuat mendeteksi file
saat Vite memproses modul; restart dev server bila perlu dan build ulang sebelum
deploy. Poster tampil utuh, dengan nama dan jadwal dalam teks di bawahnya.
Ketika file belum ada, gunakan fallback berinisial yang jelas, bukan foto palsu.

Materi dr. Hamidi dan dr. Kirei adalah dokter umum, sedangkan dr. Nadelia
tertulis dokter estetika. Mereka tidak dipresentasikan sebagai dokter gigi.

## Foto tempat, tarif, dan testimoni

`clinic-interior.jpg` dan `clinic-lounge.jpg` masih ilustrasi konsep, bukan
representasi klinik yang telah diverifikasi. Ganti dengan foto asli berizin
setelah diskusi dengan klinik. Tambahkan tombol galeri dengan atribut
`data-gallery-image=""` berisi `<img src="...">`; URL gambar diambil dari elemen
img yang diproses Vite agar tetap benar dalam build produksi. Gunakan
`data-gallery-caption` untuk caption. Jangan menampilkan hasil perawatan
sebagai hasil klinik tanpa sumber dan izin pasien.

Bagian `#biaya` pada `index.html` menampilkan faktor biaya dan tautan pertanyaan
ke admin. Angka tidak diisi sebelum tarif resmi serta komponennya disetujui.
Saat menambahkan harga, jelaskan satuan, apakah konsultasi/obat termasuk, dan
bahwa biaya akhir mengikuti pemeriksaan.

Untuk menampilkan beberapa testimoni asli, isi `PATIENT_REVIEWS` dalam
`assets/js/clinic-data.js` dengan struktur berikut (nilai harus berasal dari
ulasan asli, bukan contoh yang dipublikasikan):

```ts
{
  name: string,
  quote: string,
  sourceUrl: string, // URL sumber lengkap HTTP(S)
  approved: true   // sumber dan izin publikasi sudah diperiksa
}
```

Kutipan ditampilkan sebagai teks, bukan HTML. Entri tidak sah/tanpa persetujuan
tidak ditampilkan. Jika daftar kosong, tampilan menjelaskan bahwa kutipan belum
tersedia dan memberikan tautan pencarian klinik di Google Maps.

## Lokasi dan tautan

- WhatsApp: `6281359599996` (sesuai poster yang diberikan).
- Instagram: `https://www.instagram.com/hademedica/` (handle pada poster).
- Pin sementara: `-6.796823, 106.776861`, sumber pihak ketiga yang mencocokkan
  nama, alamat, dan nomor telepon: <https://exa.ai/library/place/spd1y08l8l1>.
- Google Place ID / permalink profil bisnis belum diverifikasi. Minta tautan
  Maps resmi dari klinik sebelum publikasi. Link ulasan masih pencarian nama
  klinik, bukan klaim terhubung ke ulasan tertentu.

Jadwal poster tidak digunakan untuk membuat klaim buka/tutup secara langsung:
hari libur, perubahan praktik, dan kapasitas pasien belum terhubung ke sistem.
Nomor SIP, email, rating, testimoni, dan nama dokter contoh sebelumnya sudah
dihapus karena belum ada sumber yang dapat diverifikasi.

## Privasi dan layanan pihak ketiga

Tidak ada penyimpanan data pasien pada backend atau localStorage. Data formulir
hanya disusun di memori dan menjadi parameter pesan pada tautan WhatsApp ketika
pengguna melanjutkan. Sampaikan informasi medis terperinci langsung kepada dokter,
bukan melalui kolom catatan. WhatsApp memproses data sesuai kebijakannya.

Google Maps dan Google Fonts untuk teks membutuhkan internet serta
melibatkan permintaan ke server Google. Ikon Material Symbols sudah di-host
lokal sebagai subset kecil; lisensi Apache 2.0 ada di `assets/fonts/`. Pertimbangkan hosting font sendiri dan
mekanisme persetujuan peta sesuai kebutuhan kebijakan privasi klinik. Pernyataan
privasi pada demo harus ditinjau lagi sebelum peluncuran resmi.

## Validasi

```sh
npm test
npm run build
npm run test:e2e -- --workers=2
```

Unit test menggunakan `node:test`. Pengujian browser menggunakan Playwright dan
Google Chrome yang **sudah terpasang** (`channel: 'chrome'`), agar tidak perlu
mengunduh Chromium tambahan. Playwright memulai dan menutup Vite secara otomatis.
Tes browser mencakup desktop/mobile, pilihan dokter, jam praktik, validasi,
pesan WhatsApp (tanpa benar-benar mengirim), dialog, FAQ, menu, reduced motion,
dan overflow layar 360–1440px. Screenshot ada di `test-results/`.

`npm audit` saat perubahan ini menemukan advisori pada dependensi alat build
Tailwind 3 (braces / postcss-selector-parser beserta dependensinya). Perbaikan
otomatis meminta migrasi mayor ke Tailwind 4, sehingga tidak diterapkan diam-diam.
Dependensi tersebut tidak dikirim sebagai JavaScript ke pengunjung; perbarui
pipeline build secara terencana dan jangan mengekspos dev server ke publik.

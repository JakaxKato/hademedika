# Hade Medika Cicurug — website layanan gigi

Website statis dengan Vite, Tailwind CSS 3 yang dikompilasi saat build,
JavaScript modular, serta tipografi Newsreader dan Manrope. Nuansa krem dan
hijau dibuat senada dengan materi klinik yang diberikan.

**Status konten:** foto ruang klinik dan potret tim dokter berasal dari materi
klinik. Tarif resmi, ulasan, rating, dan jam kunjungan universal belum
diverifikasi, sehingga tidak ada angka atau ulasan rekaan; jadwal kunjungan
tetap dikonfirmasi admin dan ulasan ditautkan ke Google Maps.

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

- **Media klinik** (`.clinic-media`): foto ruang tunggu pada hero (rasio 4:3,
  `assets/images/klinik-hade-medika.png`) dan potret tim dokter pada kartu
  (rasio 4:5). Placeholder sage tetap tersedia sebagai fallback bila foto
  dokter belum ada, tanpa mengubah layout.
- **Sepuluh dokter** (tujuh dokter gigi, dua dokter umum, satu dokter estetika)
  dengan jadwal praktik dari materi poster; nama, peran, dan label jadwal
  ditampilkan sebagai teks, dan setiap tenaga dijelaskan sesuai perannya
  (tidak ada dokter umum yang dipresentasikan sebagai dokter gigi). Tidak ada
  potret, SIP, atau biografi yang dikarang. Pilihan dokter langsung mengisi
  formulir.
- **Formulir kunjungan**: nama pasien, nomor WhatsApp, kebutuhan perawatan,
  preferensi dokter, tanggal (kosong secara default, minimum hari ini menurut
  `Asia/Jakarta`), preferensi waktu (Pagi/Siang/Sore/Fleksibel), catatan, dan
  persetujuan pengiriman data.
- **Validasi inline**: setiap kolom bermasalah mendapat pesan sendiri dengan
  `aria-invalid` dan `aria-describedby`; ringkasan kesalahan tampil di atas
  tombol. Nomor WhatsApp Indonesia divalidasi, tanggal lampau ditolak.
- **Ringkasan sebelum kirim**: permintaan ditinjau pada dialog, lalu pengguna
  melanjutkan ke WhatsApp. Setelah itu muncul success state
  ("Permintaan siap dikirim") dan pesan status pada formulir.
- **Pesan WhatsApp terstruktur**: nama, layanan, dokter pilihan, tanggal,
  preferensi waktu, dan catatan — dengan penegasan bahwa jadwal belum pasti.
- **Informasi biaya** per layanan dengan tombol WhatsApp berisi pertanyaan
  estimasi awal; tidak ada tarif rekaan, dan disebut jelas bahwa estimasi bukan
  biaya final.
- **Ulasan jujur**: satu blok kepercayaan yang menautkan ke Google Maps, plus
  slot rating opsional (`#google-rating`) yang dibiarkan kosong sampai angkanya
  diverifikasi klinik.
- Embed Google Maps interaktif, tautan "Buka di Google Maps" / "Petunjuk Rute",
  kontak WhatsApp, Instagram, FAQ, informasi privasi, favicon SVG/PNG, dan ikon
  sentuh Apple.
- Dialog native dengan Escape/fokus keyboard, menu dan FAQ dengan status ARIA,
  tombol ≥44px di mobile, sticky booking bar yang tidak menutupi kolom
  formulir (`scroll-margin-bottom`), serta animasi yang hanya memakai
  opacity/transform dan menghormati `prefers-reduced-motion`.
- Konten tetap terlihat ketika JavaScript/IntersectionObserver tidak tersedia.

## Mengganti media klinik dan foto dokter

1. **Hero** (`index.html`, cari `clinic-media-img`): foto saat ini memakai
   `assets/images/klinik-hade-medika.png` dengan alt deskriptif. Untuk
   menggantinya, timpa file tersebut atau ubah `src`; pertahankan
   `class="clinic-media-img"`, `data-ratio="4x3"` pada `.clinic-media`, dan
   `.clinic-media-frame` agar rasio serta layout hero tidak bergeser. Foto
   potret akan dipotong otomatis dengan `object-fit: cover`; crop ke 4:3
   sebelum diunggah bila seluruh bagian penting ingin terlihat.
2. **Dokter**: letakkan potret di `assets/images/doctors/`. Nama file dicocokkan
   ke key dokter setelah awalan `drg`/`dr`, titik, spasi, dan tanda hubung
   dibuang — `drg-eka.jpg`, `eka.jpg`, dan `dr. Eka.JPG` sama-sama dikenali
   (lihat `assets/images/doctors/README.md` untuk daftar lengkap). Pemuat Vite
   mendeteksi file saat dev server/build berjalan; kartu otomatis menampilkan
   foto dengan `object-fit: cover`, rasio 4:5 yang tetap, dan alt text
   (`drg. …, Dokter Gigi`). Poster profil dari klinik juga tampil utuh selama
   rasionya mendekati 4:5.

Gunakan hanya foto berizin dari klinik, dengan pencahayaan yang konsisten dan
tanpa filter yang mengubah wajah. Simpan hero dan potret dokter sebagai JPG,
PNG, atau WebP, lalu kompres ke ukuran yang wajar sebelum deploy.

## Informasi yang harus diverifikasi sebelum publikasi

- Tarif, komponen biaya, dan metode pembayaran.
- Jam praktik terbaru per dokter, hari libur, dan jam kunjungan universal.
- Kerja sama BPJS/asuransi.
- Tautan Google Business Profile (Place ID) dan rating ulasan, termasuk izin
  menampilkan angkanya pada `#google-rating`.
- Izin publikasi foto ruang klinik, tim, dan hasil perawatan (hasil hanya
  dengan izin pasien).
- Nomor WhatsApp `6281359599996` dan handle Instagram `@hademedica` (keduanya
  berasal dari materi poster).
- Pin sementara `-6.796823, 106.776861` berasal dari sumber pihak ketiga; minta
  tautan Maps resmi dari klinik sebelum publikasi.
- Jadwal praktik kesepuluh dokter ditranskrip dari poster klinik dan tetap
  dikonfirmasi ulang oleh admin; perbarui `assets/js/clinic-data.js` bila jam
  praktik berubah.

Jangan menambahkan nama, kredensial, penghargaan, testimoni, harga, atau jam
buka tanpa sumber tertulis dari klinik.

## Privasi dan layanan pihak ketiga

Tidak ada penyimpanan data pasien pada backend atau localStorage. Data formulir
hanya disusun di memori dan menjadi parameter pesan pada tautan WhatsApp ketika
pengguna melanjutkan. Sampaikan informasi medis terperinci langsung kepada dokter,
bukan melalui kolom catatan. WhatsApp memproses data sesuai kebijakannya.

Google Maps dan Google Fonts untuk teks membutuhkan internet serta
melibatkan permintaan ke server Google. Ikon Material Symbols sudah di-host
lokal sebagai subset kecil; lisensi Apache 2.0 ada di `assets/fonts/`.
Pertimbangkan hosting font sendiri dan mekanisme persetujuan peta sesuai
kebutuhan kebijakan privasi klinik. Pernyataan privasi harus ditinjau lagi
sebelum peluncuran resmi.

## Validasi

```sh
npm test
npm run build
npm run test:e2e -- --workers=2
```

Unit test menggunakan `node:test` (validasi formulir, normalisasi nomor,
pesan WhatsApp, dan reveal animation). Pengujian browser menggunakan Playwright
dan Google Chrome yang **sudah terpasang** (`channel: 'chrome'`), agar tidak
perlu mengunduh Chromium tambahan. Playwright memulai dan menutup Vite secara
otomatis. Tes browser mencakup desktop/mobile, audit link mati dan anchor,
validasi inline, ringkasan dan success state WhatsApp (tanpa benar-benar
mengirim), dialog, FAQ, menu, reduced motion, dan overflow layar 360–1440px.
Screenshot ada di `test-results/`.

`npm audit` menemukan advisori pada dependensi alat build Tailwind 3
(braces / postcss-selector-parser beserta dependensinya). Perbaikan otomatis
meminta migrasi mayor ke Tailwind 4, sehingga tidak diterapkan diam-diam.
Dependensi tersebut tidak dikirim sebagai JavaScript ke pengunjung; perbarui
pipeline build secara terencana dan jangan mengekspos dev server ke publik.

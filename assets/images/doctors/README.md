# Foto tim dokter

Letakkan potret resmi dari klinik di direktori ini. Nama file dicocokkan ke key
dokter setelah awalan `drg`/`dr`, titik, spasi, dan tanda hubung dibuang, jadi
`drg-eka.jpg`, `eka.jpg`, `dr. Eka.jpg`, dan `Eka.JPG` semuanya mengenali drg. Eka.

Daftar lengkap (ekstensi `.jpg`, `.jpeg`, `.png`, atau `.webp`, huruf kecil):

| Nama file | Dokter | Peran di kartu |
| --------- | ------ | -------------- |
| `drg-eka.jpg` | drg. Eka | Dokter Gigi |
| `drg-hanif.jpg` | drg. Hanif | Dokter Gigi |
| `drg-irsyad.jpg` | drg. Irsyad | Dokter Gigi |
| `drg-firda.jpg` | drg. Firda | Dokter Gigi |
| `drg-linni.jpg` | drg. Linni | Dokter Gigi |
| `drg-shania.jpg` | drg. Shania | Dokter Gigi |
| `drg-isna.jpg` | drg. Isna | Dokter Gigi |
| `dr-hamidi.jpg` | dr. Hamidi | Dokter Umum |
| `dr-kirei.jpg` | dr. Kirei | Dokter Umum |
| `dr-nadelia.jpg` | dr. Nadelia | Dokter Estetika |

Ekstensi lain (HEIC, AVIF, misalnya) diabaikan tanpa pesan — konversi dulu ke
JPG/PNG/WebP, jangan hanya mengganti nama ekstensi.

## Perilaku kartu

Selama file belum ada, kartu memakai komponen media placeholder: bingkai sage
dengan monogram inisial dan label "Media klinik akan ditambahkan" — bukan foto
orang lain dan bukan gambar rusak. Begitu file tersedia, komponen yang sama
menampilkan foto dengan `object-fit: cover` pada rasio 4:5 yang tetap, plus alt
text otomatis (`drg. …, Dokter Gigi`). Jadi foto boleh ditambahkan bertahap;
kartu yang belum ada file tetap memakai placeholder.

Poster profil dari klinik juga berfungsi apa adanya: rasionya (sekitar 490×600)
mendekati 4:5, jadi hampir seluruh poster terlihat. Unggah potret tegak dengan
rasio mendekati 4:5 (disarankan sekitar 800×1000 px, wajah di bagian atas
frame, pencahayaan seragam) agar tidak ada bagian penting yang terpotong.
Jangan memberi filter yang mengubah wajah, dan kompres ke ±200–400 KB per file
(WebP atau JPG lebih ringan daripada PNG).

## Setelah menaruh file

Restart dev server (`npm run dev`) supaya daftar file dibaca ulang, lalu jalankan
`npm run build` sebelum deploy. Jika sebuah foto tidak muncul, hampir selalu
penyebabnya nama file tidak cocok dengan tabel di atas.

## Jadwal dokter

Jadwal ditulis di `assets/js/clinic-data.js` (`scheduleLabels`). Kesepuluh
jadwal sudah ditranskrip dari poster klinik — termasuk dr. Hamidi
(`Senin–Sabtu · 08:00–20:00 WIB`), dr. Kirei (`Minggu · 08:00–18:00 WIB`), dan
dr. Nadelia (`Senin–Sabtu · 13:00–17:00 WIB`, `Minggu · By Appointment`).
Halaman selalu menyebut jadwal dikonfirmasi ulang oleh admin; perbarui file itu
bila klinik mengubah jam, dan jangan menambah jam tanpa sumber dari klinik.

# Foto dokter gigi

Letakkan potret resmi dari klinik di direktori ini dengan nama berikut
(ekstensi `.jpg`, `.jpeg`, `.png`, atau `.webp`, huruf kecil):

- `drg-eka.jpg`
- `drg-hanif.jpg`
- `drg-irsyad.jpg`
- `drg-firda.jpg`
- `drg-linni.jpg`
- `drg-shania.jpg`
- `drg-isna.jpg`

Nama tanpa awalan `drg-`, misalnya `eka.png`, juga dikenali.

## Perilaku kartu

Selama file belum ada, kartu dokter memakai komponen media placeholder: bingkai
sage dengan monogram inisial dan label "Media klinik akan ditambahkan" — bukan
foto orang lain dan bukan gambar rusak. Begitu file tersedia, komponen yang
sama menampilkan foto dengan `object-fit: cover` pada rasio 4:5 yang tetap,
plus alt text otomatis (`Foto drg. …, Dokter Gigi di Hade Medika Cicurug`).

Karena rasio terkunci dan memakai `cover`, unggah potret tegak (disarankan
sekitar 800×1000 px, wajah di bagian atas frame, pencahayaan seragam). Poster
berisi teks jadwal tidak cocok ditampilkan utuh di slot ini; jadwal praktik
sudah tersedia sebagai teks di bawah nama dokter. Jangan memberi filter yang
mengubah wajah.

Restart dev server jika file baru belum terdeteksi; jalankan ulang
`npm run build` sebelum deploy.

Dokter umum dr. Hamidi dan dr. Kirei, serta dokter estetika dr. Nadelia,
tidak dimasukkan ke halaman layanan gigi. Materi mereka dapat dipakai pada
halaman layanan umum terpisah setelah cakupan website disetujui klinik.

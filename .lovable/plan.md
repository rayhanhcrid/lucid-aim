## Yang akan dibangun

Tiga peningkatan, diurutkan dari yang paling terasa dampaknya.

### 1. Weekly Review & insight otomatis

Halaman baru **/review** (masuk ke menu sidebar + menu mobile), plus kartu ringkas "Rekap minggu ini" di Beranda yang menautkan ke sana.

Isinya, dihitung dari data yang sudah ada (habit, completions, goals, jurnal):
- **Skor minggu** — persentase penyelesaian habit 7 hari terakhir, dibanding minggu sebelumnya (naik/turun berapa poin).
- **Paling konsisten** — 3 habit dengan penyelesaian tertinggi minggu ini.
- **Yang bolong** — habit dengan penyelesaian terendah, plus hari apa saja yang terlewat.
- **Mood & energi** — rata-rata dari jurnal minggu ini, dengan grafik garis 7 hari; ditambah satu kalimat kaitan sederhana (misal "hari dengan mood tinggi rata-rata 82% habit selesai, hari mood rendah 41%").
- **Progres tujuan** — milestone yang selesai minggu ini dan tujuan mingguan yang belum tuntas.
- **Saran fokus minggu depan** — 2–3 kalimat yang ditulis otomatis oleh AI (Lovable AI) dari ringkasan angka di atas, dalam bahasa Indonesia dan bernada tenang/mendorong. Ada fallback berbasis aturan kalau AI gagal, jadi halaman tidak pernah kosong.
- Tombol **"Simpan rekap ke jurnal"** supaya refleksinya tersimpan.

### 2. Polesan interaksi & micro-animation

- **Ceklis habit**: animasi ring/checkmark yang "menutup", pantulan halus, plus getaran singkat di HP (Vibration API) — sensasi seperti Apple Fitness.
- **Confetti streak**: muncul saat menyelesaikan semua habit hari itu atau mencapai streak kelipatan 7.
- **Transisi halaman**: fade+slide halus antar route, dan nav item aktif dengan indikator yang meluncur.
- **Skeleton loading** sebelum store terhidrasi (menggantikan flash konten kosong sekarang).
- **Empty state** yang lebih hidup di habit/tujuan/jurnal/kalender: ilustrasi ringan + ajakan aksi, bukan teks datar.
- **Progress bar & ring**: angka menghitung naik (count-up) saat pertama tampil, bukan langsung lompat.
- Semua animasi hormat pada `prefers-reduced-motion`.

### 3. Pengingat & PWA

- **Installable**: manifest lengkap (nama, ikon 192/512 + maskable, theme color teal, `display: standalone`), apple-touch-icon, dan splash yang benar — bisa "Add to Home Screen" dan buka tanpa address bar.
- **Offline**: service worker via `vite-plugin-pwa`, dengan guard supaya tidak pernah aktif di preview Lovable (hanya di app yang sudah dipublish). Cache aset; HTML tetap network-first.
- **Pengingat harian**: pengaturan di Profil untuk jam pengingat habit (mis. 08:00) dan jurnal malam (mis. 21:00), memakai Notification API browser. Ada tombol izin notifikasi dan preview notifikasi.

### Detail teknis

- Perhitungan review ditaruh di `src/lib/review.ts` (pure functions, mudah diuji), UI di `src/routes/review.tsx`.
- Saran AI lewat `createServerFn` di `src/lib/review.functions.ts` → Lovable AI Gateway; prompt hanya menerima angka agregat, bukan isi jurnal mentah, kecuali kamu izinkan.
- Confetti: `canvas-confetti` (ringan, no dependency berat).
- Transisi: CSS/`tw-animate-css` dulu; pakai Motion hanya kalau perlu `AnimatePresence`.
- PWA mengikuti pola guarded registration (tidak register di iframe/preview/dev, dukung `?sw=off`).

### Catatan jujur soal pengingat

Notifikasi terjadwal murni di browser hanya jalan andal saat app pernah dibuka / tab masih hidup; iOS Safari juga baru mendukung notifikasi setelah app di-install ke Home Screen. Untuk pengingat yang benar-benar sampai walau app tertutup, perlu web push + backend (Lovable Cloud). Aku bangun versi lokal dulu; kalau kamu mau yang "beneran push", tinggal bilang dan aku tambahkan setelahnya.
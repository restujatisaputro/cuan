# Cuan — Pencatatan Keuangan Pribadi

Aplikasi web untuk mencatat keuangan rumah tangga: arus kas harian, utang dan
piutang berjadwal, target tabungan, portofolio investasi, anggaran bulanan, dan
laporan. Dirancang untuk dijalankan sendiri (self-hosted) di komputer atau
server kecil, dengan basis data SQLite satu berkas yang mudah dicadangkan.

Antarmuka sepenuhnya berbahasa Indonesia dan mengutamakan tampilan ponsel.

## Fitur

| Modul | Isi |
|---|---|
| Autentikasi | Daftar, masuk, ganti password, profil (mata uang & zona waktu). Pengguna pertama otomatis menjadi administrator |
| Akun | Kas, bank, e-wallet, kartu kredit, dengan saldo berjalan dan arsip |
| Kategori | Pemasukan & pengeluaran, dua tingkat (kategori dan sub-kategori) |
| Transaksi | Pemasukan, pengeluaran, dan transfer antar akun; filter tersimpan di URL, paginasi, ekspor CSV |
| Transaksi berulang | Aturan harian/mingguan/bulanan/tahunan yang membuat transaksi otomatis |
| Anggaran | Batas pengeluaran per kategori per bulan, dengan progres dan penyalinan dari bulan lalu |
| Utang & piutang | Jadwal angsuran anuitas/flat/tanpa bunga, pencatatan pembayaran dengan pemisahan pokok dan bunga |
| Tabungan | Target dana, setoran, progres, dan proyeksi tanggal tercapai |
| Investasi | Aset saham/reksa dana/emas/kripto, pembelian, penjualan, dividen, biaya rata-rata tertimbang, laba belum terealisasi |
| Laporan | Arus kas per kategori, laba rugi sederhana, kekayaan bersih |
| Administrasi | Kelola pengguna, aktif/nonaktifkan akses |

## Teknologi

- **Next.js 15** (App Router, Server Components, Server Actions) + **React 19**
- **TypeScript** mode ketat, tanpa `any`
- **Tailwind CSS v4** + **shadcn/ui**
- **Prisma ORM** di atas **SQLite**
- **Auth.js v5** (Credentials + bcrypt, sesi JWT)
- **Recharts** untuk grafik, **Vitest** untuk pengujian

## Menjalankan di komputer sendiri

Prasyarat: Node.js 20 atau lebih baru.

```bash
git clone <repo> cuan
cd cuan
npm install

cp .env.example .env
# Isi AUTH_SECRET dan NEXTAUTH_SECRET, buat dengan:
#   openssl rand -base64 32

npm run db:migrate     # membuat berkas basis data dan tabelnya
npm run dev            # buka http://localhost:3000
```

Akun pertama yang mendaftar otomatis menjadi administrator.

Ingin data contoh untuk mencoba-coba? Isi `SEED_PASSWORD` di `.env`, lalu:

```bash
npm run db:seed
```

Seed membuat tiga pengguna contoh (`admin@cuan.id`, `budi@cuan.id`,
`rina@cuan.id`) beserta ratusan transaksi, utang, tabungan, dan investasi.
Tidak ada password polos yang disimpan di dalam repositori: bila
`SEED_PASSWORD` kosong, seed membuat password acak dan menampilkannya sekali.

## Skrip npm

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Membuat build produksi |
| `npm start` | Menjalankan hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `npm test` | Menjalankan unit test (Vitest) |
| `npm run db:migrate` | Menerapkan migrasi ke basis data |
| `npm run db:seed` | Mengisi data contoh |
| `npm run db:studio` | Membuka Prisma Studio |
| `npm run db:backup` | Menyalin basis data ke folder backup bertanggal |

## Struktur proyek

```
prisma/          skema, migrasi, dan seed
scripts/         backup basis data dan pemeriksaan data seed
src/app/         rute Next.js: (auth) untuk masuk/daftar, (app) untuk isi aplikasi
src/components/  komponen bersama dan shadcn/ui
src/features/    satu folder per modul: schema (Zod), service (baca), actions (tulis), components
src/lib/         utilitas lintas modul: uang, periode, CSV, perhitungan keuangan, sesi, Prisma
```

Setiap modul memisahkan **service** (query baca, hanya di server) dari
**actions** (Server Action untuk menulis). Semua penulisan memvalidasi masukan
dengan Zod lalu memeriksa ulang kepemilikan data terhadap `userId` sesi.

## Aturan pencatatan yang perlu diketahui

Beberapa keputusan berpengaruh langsung pada angka yang Anda lihat:

- **Uang disimpan sebagai `BigInt` rupiah penuh.** Tidak ada pecahan sen dan
  tidak ada pembulatan floating point. Unit serta harga per unit investasi
  memakai `Decimal` karena memang butuh pecahan.
- **Transfer antar akun sendiri bukan pemasukan atau pengeluaran.** Menarik
  tunai dari bank ke dompet tidak memengaruhi laporan arus kas.
- **Kekayaan bersih** = saldo akun kas + nilai pasar investasi + sisa piutang −
  sisa utang. Saldo akun "Portofolio Investasi" sengaja dikecualikan supaya
  investasi tidak terhitung dua kali.
- **Laba rugi mengoreksi arus kas.** Pelunasan pokok cicilan mengurangi
  kewajiban, jadi bukan beban; pokok piutang yang kembali menambah kas, tetapi
  bukan penghasilan. Bunga tetap dihitung sebagai beban.
- **Pembelian investasi dicatat sebagai transfer** dari akun kas ke akun
  Portofolio Investasi, sehingga tidak muncul sebagai pengeluaran. Dividen
  masuk sebagai pemasukan.
- **Biaya transaksi pembelian masuk ke harga perolehan**; penjualan melepas unit
  pada biaya rata-rata tertimbang saat itu dan mencatat laba terealisasi.
- **Tanggal transaksi disimpan sebagai tengah malam UTC** yang mewakili tanggal
  kalender setempat, agar tidak bergeser saat ditampilkan di zona waktu mana pun.

## Transaksi berulang

Aturan berulang tidak berjalan sendiri di dalam aplikasi; ada dua cara
menjalankannya.

**Manual.** Buka halaman *Berulang* lalu tekan **Jalankan sekarang**. Aturan
yang tertunggak akan dikejar sekaligus (dibatasi 60 transaksi per aturan).

**Terjadwal.** Panggil endpoint berikut sekali sehari dari penjadwal sistem.
Isi `CRON_SECRET` di `.env` lebih dulu.

```bash
curl -X POST https://cuan.example.com/api/cron/berulang \
  -H "Authorization: Bearer $CRON_SECRET"
```

- **Linux (crontab):** `5 1 * * * curl -sS -X POST ... `
- **Windows:** Task Scheduler → Daily → Action: `curl.exe` dengan argumen di atas
- **Docker:** tambahkan layanan cron kecil, atau jalankan dari host

Endpoint ini aman dipanggil berkali-kali: setiap aturan hanya membuat transaksi
untuk tanggal yang belum terlewati, lalu jadwal berikutnya dimajukan dalam
transaksi basis data yang sama sehingga tidak pernah dobel.

## Backup dan pemulihan

```bash
npm run db:backup        # menyalin ke ./backup/cuan-YYYYMMDD-HHMMSS.db
```

Berkas WAL/SHM ikut disalin bila ada. Untuk memulihkan, hentikan aplikasi lalu
timpa `data/cuan.db` dengan salinan yang diinginkan.

Jadwalkan backup harian dengan cara yang sama seperti penjadwal di atas, atau
cukup salin folder `data/` — seluruh basis data hanya satu berkas.

## Deploy dengan Docker

```bash
cp .env.example .env
# Isi AUTH_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL, dan CRON_SECRET

docker compose up -d --build
```

Migrasi basis data dijalankan otomatis setiap container naik. Folder `data/`
dan `backup/` dipetakan ke host, jadi basis data tetap aman saat image
diperbarui:

```bash
docker compose pull && docker compose up -d --build   # perbarui aplikasi
docker compose logs -f cuan                            # lihat log
```

Image memakai keluaran *standalone* Next.js dan berjalan sebagai pengguna tanpa
hak root di dalam container.

## Membuka lewat Cloudflare Tunnel

Cara paling praktis mengakses aplikasi dari luar rumah tanpa membuka porta di
router.

1. Buat tunnel di dashboard Cloudflare Zero Trust, arahkan ke
   `http://cuan:3000` (nama layanan di docker compose).
2. Salin token tunnel ke `.env`:

   ```
   TUNNEL_TOKEN="token-dari-cloudflare"
   NEXTAUTH_URL="https://cuan.example.com"
   AUTH_TRUST_HOST="true"
   ```

3. Jalankan bersama profil tunnel:

   ```bash
   docker compose --profile tunnel up -d
   ```

`AUTH_TRUST_HOST` diperlukan karena aplikasi berada di belakang proksi.
Cookie sesi otomatis memakai atribut `Secure` saat `NODE_ENV=production`.

## Keamanan

- Password di-hash dengan **bcrypt cost 12**; hash tidak pernah keluar dari server.
- Sesi memakai **JWT pada cookie `httpOnly`, `sameSite=lax`**, dan `secure` di produksi.
- Token sesi hanya menyimpan id dan peran; nama, mata uang, dan status aktif
  selalu dibaca segar dari basis data, sehingga penonaktifan akun langsung berlaku.
- Seluruh mutasi memakai **Server Action** (POST dengan pemeriksaan Origin oleh
  Next.js) sebagai proteksi CSRF.
- **Pembatas laju**: login 5 percobaan per 15 menit per IP+email, registrasi
  5 akun per jam per IP.
- **Header keamanan** dipasang untuk semua respons: CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  dan HSTS di produksi.
- Middleware menyaring rute, dan setiap halaman serta Server Action tetap
  memverifikasi sesi sendiri sebagai pertahanan berlapis.

## Pengujian

```bash
npm test           # unit test
npm run typecheck  # pemeriksaan tipe
npm run lint       # ESLint
```

Unit test berfokus pada logika yang paling berisiko salah hitung: konversi dan
format uang, batas periode bulanan, jadwal angsuran (anuitas, flat, tanpa
bunga), alokasi pembayaran, posisi portofolio investasi, jadwal transaksi
berulang, validasi transaksi, pembatas laju, dan penyusunan CSV.

## Catatan portabilitas ke PostgreSQL

Skema sengaja tidak memakai fitur khusus SQLite:

- Tidak ada raw SQL; semua query lewat Prisma.
- Kolom bertipe "enum" disimpan sebagai `String` dengan daftar nilai di
  `src/lib/constants.ts`, siap diubah menjadi enum asli PostgreSQL.
- Nominal `BigInt` memetakan ke `bigint`, `Decimal` ke `numeric`.
- Tag transaksi disimpan sebagai teks berpemisah koma, bukan array.

Untuk pindah: ganti `provider` pada `prisma/schema.prisma` menjadi
`postgresql`, sesuaikan `DATABASE_URL`, lalu buat ulang migrasi awal.

## Lisensi

Proyek pribadi. Gunakan sesuai kebutuhan Anda sendiri.

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
npm run db:backup                                  # dari mesin pengembangan
docker compose exec cuan node scripts/backup-db.mjs  # dari dalam container
```

Keduanya menjalankan berkas yang sama. Bentuknya `.mjs`, bukan TypeScript,
supaya tidak memerlukan `tsx` — di sebagian server Node hanya tersedia di dalam
container, dan skrip yang butuh perkakas pengembangan tidak akan bisa dipakai
justru di mesin yang paling membutuhkannya.

**Jangan mencadangkan dengan `cp data/cuan.db`.** Sejak `journal_mode` menjadi
WAL, transaksi terbaru tinggal di `cuan.db-wal` dan belum tentu sudah masuk ke
berkas utama; menyalin berkas utama saja menghasilkan salinan yang tertinggal
isi. Menyalin ketiganya satu per satu juga tidak menolong — penyalinan tidak
atomik, jadi hasilnya tiga potret pada tiga saat berbeda. Skrip di atas memakai
`VACUUM INTO`, yang membaca dalam satu transaksi dan menghasilkan satu berkas
mandiri, konsisten, dan sudah rapat, tanpa menghentikan aplikasi.

Untuk memulihkan, hentikan aplikasi, hapus `cuan.db-wal` dan `cuan.db-shm` bila
ada, lalu timpa `data/cuan.db` dengan salinan yang diinginkan.

### Memastikan WAL benar-benar aktif

```bash
od -An -tu1 -j18 -N2 data/cuan.db     # 2 2 = WAL, 1 1 = jurnal lama
```

Dua byte pada offset 18 dan 19 adalah penanda mode di kepala berkas. Cara ini
bekerja tanpa `sqlite3` terpasang.

**Jangan menilainya dari ada tidaknya `cuan.db-wal`.** Kedua berkas pendamping
baru lahir pada transaksi tulis pertama, bukan saat koneksi dibuka — container
yang baru naik dan belum dipakai tetap hanya punya `cuan.db` meski WAL sudah
aktif. Aplikasi juga mencatat peringatan bila modenya ternyata bukan WAL, jadi
log yang sunyi adalah pertanda baik.

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
docker compose build cuan && docker compose up -d cuan   # perbarui aplikasi
docker compose logs -f cuan                              # lihat log
```

Nama service sengaja disebut. Tanpa itu, perintah berlaku ke seluruh service
yang terbaca — termasuk apa pun yang ditambahkan `docker-compose.override.yml`
milik mesin tersebut, yang tidak terlihat dari repositori ini.

Penyesuaian khas satu mesin ditaruh di `docker-compose.override.yml`, yang
otomatis terbaca Compose dan tidak ikut ter-commit. Server produksi memakainya
untuk memetakan `127.0.0.1:8091` karena seluruh domain masuk lewat satu
cloudflared di host. **Berkas itu tidak tergantikan dan hanya ada di mesin
bersangkutan** — cadangkan sebelum `git checkout` antar-branch atau
`git clean`.

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

## Aplikasi Android

Cuan bisa dipasang di Android tanpa menduplikasi satu baris UI pun.

- **PWA** — aktif langsung. Buka `https://cuan.restujati.uk` di Chrome Android,
  pilih "Tambahkan ke layar utama". Muncul sebagai aplikasi tersendiri dengan
  ikonnya, tanpa bilah alamat.
- **APK/TWA** — pembungkus tipis di sekeliling PWA yang sama. Langkahnya ada di
  [`android/README.md`](android/README.md).

Empat berkas wajib terjangkau **tanpa cookie**, diatur di `BERKAS_TERBUKA`
(`src/auth.config.ts`) dan matcher `src/middleware.ts`:
`/manifest.webmanifest`, `/sw.js`, `/offline`, dan
`/.well-known/assetlinks.json`. Bila salah satunya ikut tersaring middleware,
PWA gagal terpasang dan TWA muncul dengan bilah alamat Chrome.

### Perilaku luring

Service worker (`public/sw.js`) menyimpan aset statis dan halaman yang sudah
pernah dibuka, sehingga aplikasi tetap terbuka saat tunnel putus. Tiga aturan
yang memandunya:

1. Hanya GET yang disentuh — Server Action adalah POST ke URL halaman yang
   sama, dan ikut ter-cache berarti pencatatan bisa rusak.
2. Seluruh `/api/` tidak pernah masuk cache.
3. Cache halaman dipisah per pengguna lewat nama cache, dan dibuang begitu
   sesi berganti atau berakhir. Cuan multi-pengguna; dasbor orang lain tidak
   boleh muncul walau sekejap.

Pencatatan transaksi baru tetap memerlukan koneksi. Antrean tulis luring
sengaja belum dibuat: sinkronisasi yang salah pada aplikasi keuangan lebih
berbahaya daripada tidak ada sinkronisasi.

## API v1 untuk klien non-peramban

Antarmuka web memakai Server Action, yang merupakan protokol internal Next.js
dan tidak bisa dipanggil klien Android. `/api/v1` menyediakan pintu kedua ke
aturan yang **sama persis** — bukan salinannya.

Kuncinya ada pada pemisahan berikut, dan hanya modul transaksi yang sudah
mengikutinya:

| Berkas | Isi | Dipanggil oleh |
| --- | --- | --- |
| `features/*/commands.ts` | Seluruh aturan tulis, bebas urusan web | keduanya |
| `features/*/service.ts` | Kueri baca | keduanya |
| `features/*/actions.ts` | Terjemahan FormData ⇄ FormState | web |
| `app/api/v1/**/route.ts` | Terjemahan HTTP ⇄ JSON | klien bearer |

Menambah modul berikutnya berarti memindahkan aturan dari `actions.ts` ke
`commands.ts`, lalu menulis route handler tipis di atasnya. Bila suatu saat
aturan ditulis ulang di dalam route handler, artinya pemisahan ini sudah bocor.

### Autentikasi

Klien Android tidak punya wadah cookie peramban, jadi sesi cookie Auth.js tidak
berlaku di sana. Tukar kredensial sekali dengan token bearer:

```bash
curl -X POST https://cuan.restujati.uk/api/v1/auth/masuk \
  -H 'Content-Type: application/json' \
  -d '{"email":"…","password":"…","namaPerangkat":"Pixel 7"}'
```

Token berlaku 180 hari, tersimpan di basis data hanya sebagai hash SHA-256, dan
bisa dicabut kapan saja lewat `POST /api/v1/auth/keluar`. Simpan di Android
Keystore, jangan di SharedPreferences biasa.

`/api/v1` sengaja berada **di luar** matcher middleware. Di dalamnya, permintaan
tanpa cookie akan dipantulkan ke `/masuk` dengan 307 berisi HTML, sedangkan yang
dibutuhkan klien adalah 401 berisi JSON.

### Endpoint

| Metode | Jalur | Keterangan |
| --- | --- | --- |
| `POST` | `/api/v1/auth/masuk` | Menukar email+password dengan token |
| `POST` | `/api/v1/auth/keluar` | Mencabut token yang sedang dipakai |
| `GET` | `/api/v1/transaksi` | Daftar berfilter, parameter sama dengan halaman web |
| `POST` | `/api/v1/transaksi` | Mencatat transaksi (201) |
| `PUT` | `/api/v1/transaksi/:id` | Mengganti seluruh isi transaksi |
| `DELETE` | `/api/v1/transaksi/:id` | Menghapus transaksi |

`PUT`, bukan `PATCH`: aturan transaksi bersifat silang-medan — transfer wajib
berakun tujuan, pemasukan wajib berkategori — sehingga pembaruan sebagian akan
melewati pemeriksaan itu.

### Membaca galat

Bercabanglah pada medan `kode`, jangan pada `pesan`; teksnya bisa berubah.

| `kode` | HTTP | Arti |
| --- | --- | --- |
| `TIDAK_DIIZINKAN` | 401 | Token tidak sah, dicabut, atau kedaluwarsa |
| `VALIDASI` | 422 | Isian ditolak; `galatField` memetakan per medan |
| `TIDAK_DITEMUKAN` | 404 | Baris tidak ada, atau milik pengguna lain |
| `TERKAIT_MODUL_LAIN` | 409 | Dimiliki modul utang/tabungan/investasi |

Nominal dikirim sebagai **string**, bukan number. Nilainya BigInt rupiah penuh;
di atas 2^53 sebuah number JavaScript mulai kehilangan digit.

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

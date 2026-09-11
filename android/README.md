# Cuan untuk Android

Dua lapis, satu basis kode. Tidak ada UI yang diduplikasi.

1. **PWA** — sudah aktif di aplikasi Next.js. Bisa dipasang lewat Chrome
   Android tanpa APK sama sekali.
2. **TWA** — pembungkus Android tipis yang menjalankan PWA yang sama secara
   layar penuh, menghasilkan berkas APK/AAB.

## Kenapa bukan native

Cuan tidak punya API JSON. Ke-15 halaman adalah React Server Component dan
seluruh mutasi lewat 11 berkas Server Action — protokol internal Next.js yang
tidak bisa dipanggil klien Android. Aplikasi native berarti membangun lapisan
REST lebih dulu, lalu menduplikasi setiap skema zod dan aturan di
`src/lib/finance`. Setiap aturan yang terduplikasi adalah tempat baru untuk
bug saldo yang tidak cocok.

## Prasyarat

Berkas berikut wajib terjangkau publik **tanpa cookie**. Semuanya sudah diatur
di `BERKAS_TERBUKA` (`src/auth.config.ts`) dan matcher `src/middleware.ts`:

| Berkas | Diambil oleh |
| --- | --- |
| `/manifest.webmanifest` | Chrome, saat memutuskan aplikasi bisa dipasang |
| `/sw.js` | Peramban, saat mendaftarkan service worker |
| `/offline` | Service worker, ketika jaringan mati |
| `/.well-known/assetlinks.json` | Perangkat Android, saat memverifikasi APK |

Uji kapan saja:

```bash
for p in manifest.webmanifest sw.js offline .well-known/assetlinks.json; do
  printf '%-32s %s\n' "$p" \
    "$(curl -s -o /dev/null -w '%{http_code}' https://cuan.restujati.uk/$p)"
done
```

Keempatnya harus `200`. Kalau ada yang `307`, berkas itu terkena middleware
dan lapisan Android akan gagal.

## Membangun APK

Perkakasnya tidak dipasang di server ini — JDK dan Android SDK berukuran
sekitar 1,5 GB, dan server Cuan hanya punya dua inti dengan disk piringan.
Jalankan dari mesin lain, atau pasang di sini bila memang dikehendaki.

### 1. Buat kunci penandatanganan

Kunci ini **tidak bisa diganti** setelah aplikasi terbit di Play Store.
Hilang berarti tidak bisa merilis pembaruan selamanya. Simpan cadangannya.

```bash
keytool -genkeypair -v \
  -keystore android/cuan.keystore \
  -alias cuan -keyalg RSA -keysize 2048 -validity 10000
```

`.gitignore` sudah menutup `android/*.keystore`.

### 2. Ambil sidik jari SHA-256

```bash
keytool -list -v -keystore android/cuan.keystore -alias cuan \
  | grep 'SHA256:'
```

### 3. Pasang sidik jari di server

Tambahkan ke `.env` pada mesin yang menjalankan Cuan, lalu bangun ulang
kontainer:

```
TWA_PACKAGE_NAME=uk.restujati.cuan
TWA_SHA256_FINGERPRINT=AA:BB:CC:...
```

Beberapa sidik jari boleh dipisah koma — diperlukan bila Play Store memakai
penandatanganan terkelola, yang menandatangani ulang dengan kunci miliknya.

Pastikan sudah berlaku:

```bash
curl -s https://cuan.restujati.uk/.well-known/assetlinks.json | python3 -m json.tool
```

Selama masih `[]`, verifikasi belum akan lolos.

### 4. Bangun

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://cuan.restujati.uk/manifest.webmanifest
# Timpa twa-manifest.json hasil init dengan berkas di direktori ini,
# lalu:
bubblewrap build
```

Hasilnya `app-release-signed.apk` (sideload) dan `app-release-bundle.aab`
(Play Store).

## Memeriksa verifikasi berhasil

Pasang APK, buka aplikasi. **Tidak boleh ada bilah alamat Chrome di atas
layar.** Kalau muncul, verifikasi Digital Asset Links gagal — hampir selalu
karena sidik jari tidak cocok atau `assetlinks.json` masih `[]`.

Penyebab yang paling sering terlewat: Play Store menandatangani ulang APK
dengan kuncinya sendiri, sehingga sidik jari yang harus dipasang adalah milik
Play, bukan milik keystore lokal. Ambil dari Play Console →
Setup → App signing.

## Catatan luring

Service worker menyimpan aset statis dan halaman yang sudah pernah dibuka.
Pencatatan transaksi baru tetap memerlukan koneksi — antrean tulis luring
belum dibuat, dan untuk aplikasi keuangan itu keputusan yang disengaja:
sinkronisasi yang salah lebih berbahaya daripada tidak ada sinkronisasi.

Cache halaman dipisah per pengguna lewat nama cache. Cuan punya peran
ADMIN/USER dan bisa berganti akun di perangkat yang sama; dasbor orang lain
tidak boleh muncul walau sekejap. Lihat komentar di `public/sw.js`.

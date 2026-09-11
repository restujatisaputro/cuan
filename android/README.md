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

Satu jebakan yang tidak terlihat dari status HTTP: `assetlinks.json` harus
`force-dynamic`. Sebagai rute statis, Next.js menjalankannya saat `next build`
— dan tahap builder di `Dockerfile` tidak punya `TWA_*`, sehingga `[]` ikut
terpanggang ke dalam image dan `.env` runtime tidak lagi berpengaruh. Status
tetap `200`, isinya saja yang selalu kosong. Karena itu selalu periksa isinya,
bukan hanya kodenya.

## Membangun APK

Perkakasnya tidak dipasang di server ini — JDK dan Android SDK berukuran
sekitar 1,5 GB, dan server Cuan hanya punya dua inti dengan disk piringan.
Jalankan dari mesin lain, atau pasang di sini bila memang dikehendaki.

### 0. Perkakas yang dibutuhkan

Bubblewrap memeriksa versi yang sangat spesifik. Yang salah versi akan gagal
dengan pesan yang tidak menjelaskan apa-apa:

| Perkakas | Versi | Catatan |
| --- | --- | --- |
| JDK | **17** | Versi lebih baru ditolak Gradle Android plugin |
| `build-tools` | **36.1.0** | Dipatok di `AndroidSdkTools.BUILD_TOOLS_VERSION`; versi lain diabaikan |
| `platforms` | **android-36** | `compileSdkVersion 36` di `app/build.gradle` hasil generate |

Bubblewrap juga menuntut tata letak SDK **gaya lama**: ia memeriksa
`<sdk>/tools` atau `<sdk>/bin`, sedangkan `commandlinetools` modern memasang
diri ke `<sdk>/cmdline-tools/latest/`. Tanpa salah satu folder itu ia berhenti
dengan `The provided androidSdk isn't correct.` Salin `bin/` dan `lib/` dari
`cmdline-tools/latest/` ke akar SDK untuk memenuhinya.

Beri tahu Bubblewrap letak keduanya lewat `~/.bubblewrap/config.json` supaya
ia tidak menawarkan mengunduh JDK sendiri (dan menggantung menunggu jawaban
pada sesi non-interaktif):

```json
{
  "jdkPath": "D:\\android-sdk\\jdk-17.0.20.1+1",
  "androidSdkPath": "D:\\android-sdk"
}
```

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

Jangan pakai `bubblewrap init`: ia mewawancarai ulang seluruh isi manifest dan
menimpa pilihan yang sudah ditetapkan di `twa-manifest.json`. Cukup salin
manifest itu ke direktori kerja sekali pakai, lalu `update` + `build` —
`update` menghasilkan proyek Android dari manifest, `build` memanggil Gradle.

```bash
npm install -g @bubblewrap/cli

mkdir -p android/build
cp android/twa-manifest.json android/build/
# Di salinan itu sesuaikan yang hanya berlaku lokal:
#   signingKey.path  -> "../cuan.keystore"
#   iconUrl / maskableIconUrl / webManifestUrl / shortcuts[].chosenIconUrl
#     -> host yang benar-benar bisa diambil saat build (lihat catatan di bawah)

cd android/build
export BUBBLEWRAP_KEYSTORE_PASSWORD="…"   # tanpa ini Bubblewrap bertanya interaktif
export BUBBLEWRAP_KEY_PASSWORD="$BUBBLEWRAP_KEYSTORE_PASSWORD"
bubblewrap update --skipVersionUpgrade
bubblewrap build --skipPwaValidation
```

Hasilnya `app-release-signed.apk` (sideload) dan `app-release-bundle.aab`
(Play Store).

**Ikon diambil saat build, bukan saat aplikasi berjalan.** Bubblewrap mengunduh
`iconUrl` lalu memanggangnya ke dalam APK. Bila server produksi belum menyajikan
`/ikon/*`, arahkan URL ikon ke server pengembangan (`npm run dev`) — berkas PNG
yang dipakai sama persis, dan `host`/`fullScopeUrl` tetap menunjuk produksi
sehingga APK-nya tidak berubah perilaku.

**`jarsigner` harus ada di `PATH`.** Tahap APK memakai `apksigner` dari
build-tools, tetapi tahap AAB memanggil `jarsigner` dari JDK. Tanpa
`$JAVA_HOME/bin` di `PATH`, APK jadi tetapi AAB gagal di langkah terakhir.

**Di Git Bash, hapus dulu `NoDefaultCurrentDirectoryInExePath`.** Bubblewrap
memanggil `gradlew.bat` tanpa awalan path; variabel itu membuat `cmd.exe`
berhenti mencari di direktori kerja, sehingga muncul
`'gradlew.bat' is not recognized`.

**`bubblewrap update` menghapus proyek lama sebelum generate ulang.** Kalau
Gradle daemon dari build sebelumnya masih hidup, ia mengunci `classes.dex` dan
penghapusan gagal separuh jalan. Hentikan daemonnya dulu (`gradlew --stop`).

### 5. Periksa hasilnya

```bash
aapt2 dump badging app-release-signed.apk | grep -E '^package|launchable-activity'
apksigner verify --print-certs app-release-signed.apk
```

`versionName` tidak boleh kosong, dan `SHA-256 digest` penanda tangan harus
sama dengan `TWA_SHA256_FINGERPRINT` yang disajikan `assetlinks.json`. Kalau
berbeda, aplikasi akan terpasang tetapi memunculkan bilah alamat Chrome.

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

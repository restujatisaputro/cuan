/**
 * Service worker Cuan.
 *
 * Tujuannya satu: aplikasi tetap terbuka cepat walau server lambat atau tunnel
 * putus. Server Cuan berjalan di disk piringan, jadi selisihnya terasa nyata.
 *
 * Aturan keamanan yang memandu seluruh berkas ini:
 *
 * 1. Hanya GET yang disentuh. Server Action Next.js adalah POST ke URL yang
 *    sama dengan halamannya -- kalau ikut di-cache, pencatatan bisa rusak.
 * 2. Apa pun di bawah /api/ tidak pernah masuk cache (auth, cron, ekspor).
 * 3. Halaman ter-cache dipisah per pengguna lewat NAMA cache. Cuan punya peran
 *    ADMIN/USER dan bisa berganti akun di perangkat yang sama; dasbor orang
 *    lain tidak boleh pernah muncul walau sekejap.
 * 4. Sebelum identitas sesi diketahui, halaman TIDAK dilayani dari cache.
 */

const VERSI = "v1";
const CACHE_ASET = `cuan-aset-${VERSI}`;
const CACHE_SISTEM = `cuan-sistem-${VERSI}`;
const PREFIX_HALAMAN = `cuan-halaman-${VERSI}-`;

const HALAMAN_LURING = "/offline";

/** Aset yang harus ada sebelum service worker dianggap siap. */
const PRECACHE = [HALAMAN_LURING, "/ikon/icon-192.png", "/ikon/icon-512.png"];

/**
 * Penanda identitas sesi disimpan di Cache API, bukan variabel biasa, supaya
 * tetap ada setelah service worker dimatikan browser dan dihidupkan lagi.
 * Tanpa ini, mode luring akan gagal setiap kali worker baru dibangunkan.
 */
const KUNCI_SESI = "https://cuan.local/__sesi";

let sesiPromise = null;

function bacaSesi() {
  if (!sesiPromise) {
    sesiPromise = caches
      .open(CACHE_SISTEM)
      .then((cache) => cache.match(KUNCI_SESI))
      .then((res) => (res ? res.text() : null))
      .catch(() => null);
  }
  return sesiPromise;
}

async function tulisSesi(id) {
  sesiPromise = Promise.resolve(id);
  const cache = await caches.open(CACHE_SISTEM);
  await cache.put(KUNCI_SESI, new Response(id));
}

/** Buang seluruh cache halaman kecuali milik pengguna yang sedang aktif. */
async function buangHalamanSelain(idAktif) {
  const sisakan = idAktif ? PREFIX_HALAMAN + idAktif : null;
  const nama = await caches.keys();
  await Promise.all(
    nama
      .filter((n) => n.startsWith(PREFIX_HALAMAN) && n !== sisakan)
      .map((n) => caches.delete(n)),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SISTEM)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nama = await caches.keys();
      await Promise.all(
        nama
          .filter(
            (n) =>
              n.startsWith("cuan-") &&
              n !== CACHE_ASET &&
              n !== CACHE_SISTEM &&
              !n.startsWith(PREFIX_HALAMAN),
          )
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.tipe === "SESI") {
    // Halaman melapor siapa yang sedang masuk pada setiap pemuatan.
    const id = typeof data.id === "string" && data.id ? data.id : null;
    event.waitUntil(
      (async () => {
        const lama = await bacaSesi();
        if (lama !== id) {
          await buangHalamanSelain(id);
          await tulisSesi(id ?? "");
        }
      })(),
    );
  }

  if (data.tipe === "BERSIHKAN") {
    // Dipanggil saat keluar: semua jejak halaman dibuang segera.
    event.waitUntil(
      (async () => {
        await buangHalamanSelain(null);
        await tulisSesi("");
      })(),
    );
  }
});

function asetStatis(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/ikon/") ||
    url.pathname === "/favicon.ico"
  );
}

/** Aset ber-hash tidak pernah berubah isinya, jadi cache lebih dulu. */
async function tanganiAset(request) {
  const cache = await caches.open(CACHE_ASET);
  const tersimpan = await cache.match(request);
  if (tersimpan) return tersimpan;

  const respons = await fetch(request);
  if (respons.ok) cache.put(request, respons.clone());
  return respons;
}

/**
 * Halaman: coba jaringan dulu supaya angka selalu yang terbaru, jatuh ke cache
 * hanya bila jaringan gagal. Urutan ini penting untuk aplikasi keuangan --
 * menampilkan saldo basi lebih berbahaya daripada menunggu sebentar.
 */
async function tanganiHalaman(request) {
  const id = await bacaSesi();
  const namaCache = id ? PREFIX_HALAMAN + id : null;

  try {
    const respons = await fetch(request);

    // Pengalihan ke /masuk berarti sesi sudah tidak sah. Buang semua halaman
    // tersimpan sebelum pengguna berikutnya sempat melihatnya.
    const keMasuk =
      respons.redirected && new URL(respons.url).pathname.startsWith("/masuk");
    if (keMasuk) {
      await buangHalamanSelain(null);
      await tulisSesi("");
      return respons;
    }

    if (respons.ok && namaCache && !respons.redirected) {
      const cache = await caches.open(namaCache);
      cache.put(request, respons.clone());
    }
    return respons;
  } catch {
    if (namaCache) {
      const cache = await caches.open(namaCache);
      const tersimpan = await cache.match(request);
      if (tersimpan) return tersimpan;
    }
    const sistem = await caches.open(CACHE_SISTEM);
    const luring = await sistem.match(HALAMAN_LURING);
    return (
      luring ??
      new Response("Sedang luring.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Aturan 1: hanya GET. Server Action dan submit form lewat begitu saja.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Aturan 2: lintas origin dan seluruh /api/ tidak disentuh sama sekali.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (asetStatis(url)) {
    event.respondWith(tanganiAset(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(tanganiHalaman(request));
  }
});

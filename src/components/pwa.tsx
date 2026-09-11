"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker.
 *
 * Ditaruh di layout akar supaya ikut aktif di halaman masuk -- aset login pun
 * jadi tersimpan, sehingga aplikasi tetap terbuka cepat pada koneksi buruk.
 */
export function DaftarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const daftar = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Pendaftaran gagal bukan alasan untuk merusak halaman: aplikasi tetap
        // berjalan normal, hanya kehilangan kemampuan luring.
      });
    };

    // Ditunda sampai halaman selesai memuat agar tidak berebut bandwidth
    // dengan render pertama.
    if (document.readyState === "complete") {
      daftar();
      return;
    }
    window.addEventListener("load", daftar);
    return () => window.removeEventListener("load", daftar);
  }, []);

  return null;
}

/**
 * Memberi tahu service worker siapa yang sedang masuk.
 *
 * Cache halaman dipisah per pengguna. Tanpa laporan ini service worker tidak
 * tahu identitas sesi, dan sesuai rancangannya ia akan menolak melayani
 * halaman apa pun dari cache -- mode luring mati diam-diam.
 */
export function LaporSesi({ id }: { id: string }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let batal = false;

    navigator.serviceWorker.ready
      .then((registrasi) => {
        if (!batal) registrasi.active?.postMessage({ tipe: "SESI", id });
      })
      .catch(() => {});

    return () => {
      batal = true;
    };
  }, [id]);

  return null;
}

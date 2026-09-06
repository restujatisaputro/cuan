"use client";

import { useEffect } from "react";

/**
 * Penangkap terakhir bila galat terjadi pada layout akar, saat komponen
 * bergaya milik aplikasi belum tentu bisa dirender. Sengaja memakai gaya
 * inline agar tetap tampil walau CSS gagal dimuat.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Galat global:", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <main>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            Aplikasi gagal dimuat
          </h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
            Terjadi kesalahan tak terduga. Muat ulang halaman untuk mencoba lagi.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              background: "#0f172a",
              color: "white",
              cursor: "pointer",
            }}
          >
            Muat ulang
          </button>
        </main>
      </body>
    </html>
  );
}

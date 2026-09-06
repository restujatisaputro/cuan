import type { NextRequest } from "next/server";
import { signOut } from "@/auth";

/**
 * Mengakhiri sesi lalu mengalihkan ke halaman masuk.
 *
 * Dipakai saat sesi tidak lagi sah (akun dinonaktifkan atau dihapus admin)
 * sehingga cookie lama harus dibuang. Tombol "Keluar" biasa memakai Server
 * Action, bukan endpoint ini.
 */
export async function GET(request: NextRequest): Promise<never> {
  const alasan = request.nextUrl.searchParams.get("alasan");
  const tujuan = alasan ? `/masuk?alasan=${encodeURIComponent(alasan)}` : "/masuk";
  await signOut({ redirectTo: tujuan });
  throw new Error("tidak tercapai");
}

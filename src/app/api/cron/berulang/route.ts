import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { jalankanAturanJatuhTempo } from "@/features/recurring/service";

/**
 * Endpoint penjadwal untuk menjalankan transaksi berulang seluruh pengguna.
 *
 * Aplikasi ini dijalankan sendiri tanpa layanan cron bawaan, jadi panggil
 * endpoint ini sekali sehari dari penjadwal sistem (Task Scheduler, systemd
 * timer, atau cron) memakai header:
 *
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Aman dipanggil berkali-kali: aturan hanya membuat transaksi untuk tanggal
 * yang belum terlewati.
 */

function tokenCocok(diberikan: string, benar: string): boolean {
  const a = Buffer.from(diberikan);
  const b = Buffer.from(benar);
  // Panjang berbeda langsung ditolak; timingSafeEqual mensyaratkan panjang sama.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest): Promise<Response> {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia) {
    return Response.json(
      { pesan: "CRON_SECRET belum diatur di berkas .env." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !tokenCocok(token, rahasia)) {
    return Response.json({ pesan: "Tidak diizinkan." }, { status: 401 });
  }

  const pengguna = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let transaksiDibuat = 0;
  let aturanDiproses = 0;
  for (const item of pengguna) {
    const hasil = await jalankanAturanJatuhTempo(item.id);
    transaksiDibuat += hasil.transaksiDibuat;
    aturanDiproses += hasil.aturanDiproses;
  }

  return Response.json({
    pengguna: pengguna.length,
    aturanDiproses,
    transaksiDibuat,
    waktu: new Date().toISOString(),
  });
}

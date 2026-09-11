import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/features/auth/service";
import { terbitkanToken } from "@/lib/api-auth";
import { galatApi, jsonApi } from "@/lib/api-response";

/**
 * Menukar email dan password dengan token bearer untuk klien non-peramban.
 *
 * Verifikasi password memakai verifyPassword dari modul auth, bukan bcrypt
 * langsung, supaya perlakuan email yang tidak terdaftar tetap sama: fungsi itu
 * tetap menjalankan satu perbandingan bcrypt terhadap hash boneka agar lama
 * proses login tidak membocorkan email mana yang terdaftar.
 */

export const dynamic = "force-dynamic";

const masukSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
  /** Ditampilkan pada daftar perangkat pengguna. */
  namaPerangkat: z.string().trim().min(1).max(60).default("Perangkat Android"),
});

export async function POST(request: Request): Promise<Response> {
  let badan: unknown;
  try {
    badan = await request.json();
  } catch {
    return galatApi("BADAN_TIDAK_VALID", "Badan permintaan bukan JSON.", 400);
  }

  const hasil = masukSchema.safeParse(badan);
  if (!hasil.success) {
    return galatApi(
      "BADAN_TIDAK_VALID",
      "Isian tidak lengkap.",
      400,
      z.flattenError(hasil.error).fieldErrors,
    );
  }

  const { email, password, namaPerangkat } = hasil.data;

  const pengguna = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, currency: true, timezone: true, isActive: true, passwordHash: true },
  });

  const cocok = await verifyPassword(password, pengguna?.passwordHash);

  // Satu pesan untuk email tak dikenal, password salah, maupun akun nonaktif.
  // Membedakannya akan memberi tahu penyerang email mana yang terdaftar.
  if (!pengguna || !cocok || !pengguna.isActive) {
    return galatApi("TIDAK_DIIZINKAN", "Email atau password salah.", 401);
  }

  const { token, kedaluwarsa } = await terbitkanToken(pengguna.id, namaPerangkat);

  return jsonApi({
    token,
    kedaluwarsa: kedaluwarsa.toISOString(),
    pengguna: {
      id: pengguna.id,
      nama: pengguna.name,
      email: pengguna.email,
      peran: pengguna.role,
      mataUang: pengguna.currency,
      zonaWaktu: pengguna.timezone,
    },
  });
}

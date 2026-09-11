import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";
import type { PenggunaSesi } from "@/lib/session";

/**
 * Autentikasi bearer untuk /api/v1.
 *
 * Klien Android tidak punya wadah cookie peramban, jadi sesi cookie Auth.js
 * tidak bisa dipakai di sana. Alur di berkas ini berdiri sendiri: tukar email
 * dan password sekali dengan token panjang umur, lalu kirim token itu pada
 * setiap permintaan berikutnya. Sesi web sama sekali tidak berubah.
 */

const AWALAN = "cuan_";
/** 32 byte acak; cukup untuk membuat penebakan tidak masuk akal. */
const PANJANG_BYTE = 32;
/** Umur token. Diperpanjang dengan menukar ulang kredensial, bukan otomatis. */
const UMUR_HARI = 180;
/**
 * Jarak minimal pembaruan lastUsedAt.
 *
 * Tanpa ambang ini, setiap permintaan API memicu satu penulisan ke basis data
 * hanya untuk memperbarui stempel waktu. Pada SQLite dengan satu penulis,
 * itu membuat pembacaan ikut mengantre di belakang tulisan yang tidak penting.
 */
const JEDA_PEMBARUAN_MS = 60 * 60 * 1000;

export type TokenTerbit = {
  /** Hanya ada di sini satu kali; yang tersimpan cuma hash-nya. */
  token: string;
  kedaluwarsa: Date;
};

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Membandingkan dua hash tanpa membocorkan posisi byte yang berbeda. */
function hashCocok(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/** Mengambil token dari header Authorization, "" bila tidak ada. */
export function tokenDariHeader(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

/**
 * Menerbitkan token baru untuk sebuah perangkat.
 *
 * Nilai mentahnya dikembalikan sekali saja. Yang masuk basis data hanya
 * hash-nya, jadi bocornya salinan basis data tidak membuat siapa pun bisa
 * memakai token yang sudah terbit.
 */
export async function terbitkanToken(
  userId: string,
  namaPerangkat: string,
): Promise<TokenTerbit> {
  const token = AWALAN + randomBytes(PANJANG_BYTE).toString("base64url");
  const kedaluwarsa = new Date(Date.now() + UMUR_HARI * 24 * 60 * 60 * 1000);

  await prisma.apiToken.create({
    data: {
      userId,
      name: namaPerangkat,
      tokenHash: hash(token),
      expiresAt: kedaluwarsa,
    },
  });

  return { token, kedaluwarsa };
}

/**
 * Pengguna di balik sebuah token, atau null bila token tidak sah.
 *
 * Status aktif dibaca segar dari basis data setiap kali, sama seperti sesi web:
 * admin yang menonaktifkan akun harus langsung berlaku, tanpa menunggu token
 * kedaluwarsa.
 */
export async function penggunaDariToken(
  token: string,
): Promise<PenggunaSesi | null> {
  if (!token.startsWith(AWALAN)) return null;

  const baris = await prisma.apiToken.findUnique({
    where: { tokenHash: hash(token) },
    select: {
      id: true,
      tokenHash: true,
      revokedAt: true,
      expiresAt: true,
      lastUsedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          currency: true,
          timezone: true,
          isActive: true,
        },
      },
    },
  });

  if (!baris) return null;
  // Pencarian di atas sudah memakai hash sebagai kunci; perbandingan ini
  // menutup celah teoretis bila suatu saat pencarian diganti jadi non-unik.
  if (!hashCocok(baris.tokenHash, hash(token))) return null;
  if (baris.revokedAt) return null;
  if (baris.expiresAt && baris.expiresAt.getTime() <= Date.now()) return null;
  if (!baris.user.isActive) return null;

  const perluCatat =
    !baris.lastUsedAt ||
    Date.now() - baris.lastUsedAt.getTime() > JEDA_PEMBARUAN_MS;
  if (perluCatat) {
    await prisma.apiToken.update({
      where: { id: baris.id },
      data: { lastUsedAt: new Date() },
    });
  }

  return {
    id: baris.user.id,
    name: baris.user.name,
    email: baris.user.email,
    role: baris.user.role as Role,
    currency: baris.user.currency,
    timezone: baris.user.timezone,
  };
}

/** Mencabut satu token. Mengembalikan false bila token tidak dikenal. */
export async function cabutToken(token: string): Promise<boolean> {
  if (!token.startsWith(AWALAN)) return false;

  const hasil = await prisma.apiToken.updateMany({
    where: { tokenHash: hash(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return hasil.count > 0;
}

/** Pengguna di balik permintaan, atau null bila header-nya tidak sah. */
export async function penggunaDariPermintaan(
  request: Request,
): Promise<PenggunaSesi | null> {
  const token = tokenDariHeader(request);
  if (!token) return null;
  return penggunaDariToken(token);
}

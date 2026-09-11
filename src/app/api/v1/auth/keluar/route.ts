import { cabutToken, tokenDariHeader } from "@/lib/api-auth";
import { TIDAK_DIIZINKAN, jsonApi } from "@/lib/api-response";

/**
 * Mencabut token yang dipakai permintaan ini.
 *
 * Barisnya tidak dihapus, hanya ditandai revokedAt, supaya daftar perangkat
 * tetap menyimpan jejak kapan sebuah token pernah dipakai dan kapan dicabut.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const token = tokenDariHeader(request);
  if (!token) return TIDAK_DIIZINKAN();

  const dicabut = await cabutToken(token);
  if (!dicabut) return TIDAK_DIIZINKAN();

  return jsonApi({ pesan: "Token dicabut." });
}

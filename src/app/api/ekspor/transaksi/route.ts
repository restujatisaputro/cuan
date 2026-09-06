import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPenggunaSesi } from "@/lib/session";
import { filterSchema } from "@/features/transactions/schema";
import { TRANSACTION_TYPE_LABEL, type TransactionType } from "@/lib/constants";

/** Batas baris agar berkas tetap wajar dibuka di spreadsheet. */
const BATAS_BARIS = 10_000;

/**
 * Membungkus satu sel CSV: tanda kutip digandakan, dan sel yang mengandung
 * pemisah, kutip, atau baris baru dikutip penuh.
 */
function sel(nilai: string | null | undefined): string {
  const teks = nilai ?? "";
  if (/[";\n\r]/.test(teks)) {
    return `"${teks.replace(/"/g, '""')}"`;
  }
  return teks;
}

function tanggalIso(tanggal: Date): string {
  return tanggal.toISOString().slice(0, 10);
}

/**
 * Ekspor transaksi terfilter sebagai CSV.
 *
 * Pemisah titik koma dan BOM UTF-8 dipakai supaya berkas langsung rapi saat
 * dibuka Excel berlokal Indonesia. Nominal ditulis sebagai angka polos tanpa
 * pemisah ribuan agar tetap bisa dihitung di spreadsheet.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const pengguna = await getPenggunaSesi();
  if (!pengguna) {
    return new Response("Tidak diizinkan", { status: 401 });
  }

  const filter = filterSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  const where = {
    userId: pengguna.id,
    ...(filter.tipe !== "SEMUA" ? { type: filter.tipe } : {}),
    ...(filter.kategori ? { categoryId: filter.kategori } : {}),
    ...(filter.akun
      ? { OR: [{ accountId: filter.akun }, { toAccountId: filter.akun }] }
      : {}),
    ...(filter.dari || filter.sampai
      ? {
          date: {
            ...(filter.dari ? { gte: new Date(`${filter.dari}T00:00:00.000Z`) } : {}),
            ...(filter.sampai
              ? { lte: new Date(`${filter.sampai}T00:00:00.000Z`) }
              : {}),
          },
        }
      : {}),
  };

  const baris = await prisma.transaction.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    take: BATAS_BARIS,
    select: {
      date: true,
      type: true,
      amount: true,
      note: true,
      tags: true,
      account: { select: { name: true } },
      toAccount: { select: { name: true } },
      category: { select: { name: true, parent: { select: { name: true } } } },
    },
  });

  const judul = [
    "Tanggal",
    "Tipe",
    "Nominal",
    "Akun",
    "Akun Tujuan",
    "Kategori",
    "Sub Kategori",
    "Catatan",
    "Tag",
  ].join(";");

  const isi = baris.map((item) => {
    const induk = item.category?.parent?.name ?? null;
    return [
      tanggalIso(item.date),
      TRANSACTION_TYPE_LABEL[item.type as TransactionType],
      item.amount.toString(),
      sel(item.account.name),
      sel(item.toAccount?.name),
      sel(induk ?? item.category?.name),
      sel(induk ? item.category?.name : null),
      sel(item.note),
      sel(item.tags),
    ].join(";");
  });

  // BOM ditulis eksplisit sebagai escape supaya tidak hilang saat berkas
  // sumber ini disunting editor yang menyembunyikan karakter tak terlihat.
  const berkas = "\uFEFF" + [judul, ...isi].join("\r\n") + "\r\n";
  const namaBerkas = `transaksi-${filter.dari ?? "awal"}-sampai-${filter.sampai ?? tanggalIso(new Date())}.csv`;

  return new Response(berkas, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
      "Cache-Control": "no-store",
    },
  });
}

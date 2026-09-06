import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPenggunaSesi } from "@/lib/session";
import { filterSchema } from "@/features/transactions/schema";
import { TRANSACTION_TYPE_LABEL, type TransactionType } from "@/lib/constants";
import { buatCsv } from "@/lib/csv";

/** Batas baris agar berkas tetap wajar dibuka di spreadsheet. */
const BATAS_BARIS = 10_000;

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
  ];

  const isi = baris.map((item) => {
    const induk = item.category?.parent?.name ?? null;
    return [
      tanggalIso(item.date),
      TRANSACTION_TYPE_LABEL[item.type as TransactionType],
      // Nominal ditulis sebagai angka polos supaya tetap bisa dihitung di spreadsheet.
      item.amount.toString(),
      item.account.name,
      item.toAccount?.name ?? null,
      induk ?? item.category?.name ?? null,
      induk ? (item.category?.name ?? null) : null,
      item.note,
      item.tags,
    ];
  });

  const berkas = buatCsv(judul, isi);
  const namaBerkas = `transaksi-${filter.dari ?? "awal"}-sampai-${filter.sampai ?? tanggalIso(new Date())}.csv`;

  return new Response(berkas, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
      "Cache-Control": "no-store",
    },
  });
}

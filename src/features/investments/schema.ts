import { z } from "zod";
import {
  INVESTMENT_ACTIONS,
  INVESTMENT_TYPES,
  type InvestmentAction,
  type InvestmentType,
} from "@/lib/constants";
import { nominal, nominalPositif } from "@/features/accounts/schema";
import { tanggalKalender } from "@/features/transactions/schema";

/**
 * Kuantitas unit: menerima format Indonesia ("1.500,25") maupun titik desimal.
 * Disimpan sebagai string agar Prisma mengubahnya menjadi Decimal tanpa
 * melewati number.
 */
export const kuantitas = z
  .string()
  .trim()
  .min(1, "Jumlah unit wajib diisi")
  .transform((nilai, ctx) => {
    const bersih = nilai.replace(/\./g, "").replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(bersih)) {
      ctx.addIssue({ code: "custom", message: "Jumlah unit tidak valid" });
      return z.NEVER;
    }
    if (Number(bersih) <= 0) {
      ctx.addIssue({ code: "custom", message: "Jumlah unit harus lebih dari nol" });
      return z.NEVER;
    }
    return bersih;
  });

/** Harga per unit boleh pecahan, mis. NAB reksa dana 1.287,4521. */
export const hargaUnit = z
  .string()
  .trim()
  .min(1, "Harga per unit wajib diisi")
  .transform((nilai, ctx) => {
    const bersih = nilai.replace(/\./g, "").replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(bersih)) {
      ctx.addIssue({ code: "custom", message: "Harga tidak valid" });
      return z.NEVER;
    }
    if (Number(bersih) <= 0) {
      ctx.addIssue({ code: "custom", message: "Harga harus lebih dari nol" });
      return z.NEVER;
    }
    return bersih;
  });

export const assetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama aset minimal 2 karakter")
    .max(80, "Nama aset maksimal 80 karakter"),
  type: z.enum(
    INVESTMENT_TYPES as unknown as [InvestmentType, ...InvestmentType[]],
    { message: "Jenis aset tidak dikenal" },
  ),
  ticker: z
    .string()
    .trim()
    .max(20, "Kode maksimal 20 karakter")
    .optional()
    .transform((nilai) => (nilai === "" ? null : (nilai?.toUpperCase() ?? null))),
  lastPrice: hargaUnit,
});

export type AssetInput = z.infer<typeof assetSchema>;

export const assetIdSchema = z.object({
  id: z.string().min(1, "Aset tidak ditemukan"),
});

export const hargaSchema = z.object({
  id: z.string().min(1, "Aset tidak ditemukan"),
  lastPrice: hargaUnit,
});

export const investmentTxSchema = z
  .object({
    assetId: z.string().min(1, "Aset tidak ditemukan"),
    action: z.enum(
      INVESTMENT_ACTIONS as unknown as [InvestmentAction, ...InvestmentAction[]],
      { message: "Aksi tidak dikenal" },
    ),
    date: tanggalKalender,
    accountId: z.string().min(1, "Akun wajib dipilih"),
    // Unit dan harga hanya dipakai untuk BUY/SELL.
    units: z.string().trim().optional(),
    pricePerUnit: z.string().trim().optional(),
    fee: nominal,
    /** Nominal dividen; hanya dipakai saat action DIVIDEND. */
    amount: z.string().trim().optional(),
    note: z.string().trim().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "DIVIDEND") {
      const hasil = nominalPositif.safeParse(data.amount ?? "");
      if (!hasil.success) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Nominal dividen wajib diisi",
        });
      }
      return;
    }

    if (!kuantitas.safeParse(data.units ?? "").success) {
      ctx.addIssue({
        code: "custom",
        path: ["units"],
        message: "Jumlah unit tidak valid",
      });
    }
    if (!hargaUnit.safeParse(data.pricePerUnit ?? "").success) {
      ctx.addIssue({
        code: "custom",
        path: ["pricePerUnit"],
        message: "Harga per unit tidak valid",
      });
    }
  });

export const investmentTxIdSchema = z.object({
  id: z.string().min(1, "Transaksi tidak ditemukan"),
});

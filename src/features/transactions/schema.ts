import { z } from "zod";
import { TRANSACTION_TYPES, type TransactionType } from "@/lib/constants";
import { nominalPositif } from "@/features/accounts/schema";

/** Batas tanggal yang masuk akal untuk pencatatan keuangan pribadi. */
const TANGGAL_MIN = new Date(Date.UTC(2000, 0, 1));
const TANGGAL_MAKS = new Date(Date.UTC(new Date().getUTCFullYear() + 5, 11, 31));

/**
 * Tanggal kalender ("YYYY-MM-DD") disimpan sebagai tengah malam UTC supaya
 * tanggalnya tidak bergeser saat ditampilkan di zona waktu mana pun.
 */
export const tanggalKalender = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
  .transform((nilai, ctx) => {
    const [tahun, bulan, hari] = nilai.split("-").map(Number);
    const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari));
    if (
      Number.isNaN(tanggal.getTime()) ||
      tanggal.getUTCMonth() !== bulan - 1 ||
      tanggal.getUTCDate() !== hari
    ) {
      ctx.addIssue({ code: "custom", message: "Tanggal tidak valid" });
      return z.NEVER;
    }
    if (tanggal < TANGGAL_MIN || tanggal > TANGGAL_MAKS) {
      ctx.addIssue({ code: "custom", message: "Tanggal di luar jangkauan wajar" });
      return z.NEVER;
    }
    return tanggal;
  });

/**
 * Id yang boleh kosong.
 *
 * Tiga bentuk "kosong" diterima karena skema ini melayani dua pemanggil dengan
 * kebiasaan berbeda. Form web selalu mengirim setiap medan, jadi yang tiba
 * berupa string kosong atau "none" dari komponen Select. Klien JSON justru
 * wajar menghilangkan medan yang tidak relevan -- pengeluaran tidak punya akun
 * tujuan -- sehingga `undefined` pun harus lolos. Ketiganya menjadi null.
 */
const idOpsional = z
  .union([z.string(), z.null()])
  .optional()
  .transform((nilai) => {
    const bersih = typeof nilai === "string" ? nilai.trim() : "";
    return bersih === "" || bersih === "none" ? null : bersih;
  });

export const transactionSchema = z
  .object({
    type: z.enum(
      TRANSACTION_TYPES as unknown as [TransactionType, ...TransactionType[]],
      { message: "Tipe transaksi tidak dikenal" },
    ),
    date: tanggalKalender,
    amount: nominalPositif,
    accountId: z.string().min(1, "Akun wajib dipilih"),
    toAccountId: idOpsional,
    categoryId: idOpsional,
    note: z.string().trim().max(200, "Catatan maksimal 200 karakter").optional(),
    tags: z.string().trim().max(120, "Tag maksimal 120 karakter").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "TRANSFER") {
      if (!data.toAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Akun tujuan wajib dipilih",
        });
      } else if (data.toAccountId === data.accountId) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Akun tujuan harus berbeda dari akun asal",
        });
      }
      return;
    }

    // Pemasukan dan pengeluaran wajib berkategori agar laporan tidak bolong.
    if (!data.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Kategori wajib dipilih",
      });
    }
  });

export type TransactionInput = z.infer<typeof transactionSchema>;

export const transactionIdSchema = z.object({
  id: z.string().min(1, "Transaksi tidak dikenal"),
});

/** Jumlah baris per halaman pada daftar transaksi. */
export const UKURAN_HALAMAN = 25;

/** Penyaring daftar transaksi yang dibaca dari query string. */
export const filterSchema = z.object({
  q: z.string().trim().max(80).optional(),
  tipe: z
    .enum(["SEMUA", ...TRANSACTION_TYPES] as unknown as [string, ...string[]])
    .catch("SEMUA"),
  akun: z.string().trim().optional(),
  kategori: z.string().trim().optional(),
  dari: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  sampai: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  hal: z.coerce.number().int().min(1).catch(1),
});

export type FilterTransaksi = z.infer<typeof filterSchema>;

import { z } from "zod";
import {
  DEBT_DIRECTIONS,
  INTEREST_TYPES,
  type DebtDirection,
  type InterestType,
} from "@/lib/constants";
import { nominal, nominalPositif } from "@/features/accounts/schema";
import { tanggalKalender } from "@/features/transactions/schema";

/** Bunga tahunan dalam persen, disimpan sebagai basis point. */
export const bungaPersen = z
  .string()
  .trim()
  .transform((nilai, ctx) => {
    if (nilai === "") return 0;
    const angka = Number(nilai.replace(",", "."));
    if (!Number.isFinite(angka) || angka < 0) {
      ctx.addIssue({ code: "custom", message: "Bunga tidak valid" });
      return z.NEVER;
    }
    if (angka > 100) {
      ctx.addIssue({ code: "custom", message: "Bunga maksimal 100% per tahun" });
      return z.NEVER;
    }
    return Math.round(angka * 100);
  });

export const debtSchema = z
  .object({
    direction: z.enum(
      DEBT_DIRECTIONS as unknown as [DebtDirection, ...DebtDirection[]],
      { message: "Jenis catatan tidak dikenal" },
    ),
    counterparty: z
      .string()
      .trim()
      .min(2, "Nama pihak minimal 2 karakter")
      .max(80, "Nama pihak maksimal 80 karakter"),
    principal: nominalPositif,
    interestRateBps: bungaPersen,
    interestType: z.enum(
      INTEREST_TYPES as unknown as [InterestType, ...InterestType[]],
      { message: "Jenis bunga tidak dikenal" },
    ),
    startDate: tanggalKalender,
    tenorMonths: z.coerce
      .number()
      .int("Tenor harus bilangan bulat")
      .min(1, "Tenor minimal 1 bulan")
      .max(600, "Tenor maksimal 600 bulan"),
    note: z.string().trim().max(200, "Catatan maksimal 200 karakter").optional(),
  })
  .refine(
    (data) => data.interestType === "NONE" || data.interestRateBps > 0,
    {
      path: ["interestRateBps"],
      message: "Isi bunga, atau pilih jenis bunga 'Tanpa bunga'",
    },
  );

export type DebtInput = z.infer<typeof debtSchema>;

export const debtIdSchema = z.object({
  id: z.string().min(1, "Catatan tidak ditemukan"),
});

export const debtPaymentSchema = z.object({
  debtId: z.string().min(1, "Catatan tidak ditemukan"),
  date: tanggalKalender,
  amount: nominalPositif,
  accountId: z.string().min(1, "Akun wajib dipilih"),
  categoryId: z
    .string()
    .trim()
    .transform((nilai) => (nilai === "" || nilai === "none" ? null : nilai))
    .nullable(),
  note: z.string().trim().max(200).optional(),
});

export const paymentIdSchema = z.object({
  id: z.string().min(1, "Pembayaran tidak ditemukan"),
});

/** Nominal opsional dipakai form yang membolehkan kosong. */
export const nominalOpsional = nominal;

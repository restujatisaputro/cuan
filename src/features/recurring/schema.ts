import { z } from "zod";
import { FREQUENCIES, TRANSACTION_TYPES, type Frequency, type TransactionType } from "@/lib/constants";
import { nominalPositif } from "@/features/accounts/schema";
import { tanggalKalender } from "@/features/transactions/schema";

const idOpsional = z
  .string()
  .trim()
  .transform((nilai) => (nilai === "" || nilai === "none" ? null : nilai))
  .nullable();

export const recurringSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama aturan minimal 2 karakter")
      .max(60, "Nama aturan maksimal 60 karakter"),
    type: z.enum(
      TRANSACTION_TYPES as unknown as [TransactionType, ...TransactionType[]],
      { message: "Tipe transaksi tidak dikenal" },
    ),
    amount: nominalPositif,
    accountId: z.string().min(1, "Akun wajib dipilih"),
    toAccountId: idOpsional,
    categoryId: idOpsional,
    frequency: z.enum(FREQUENCIES as unknown as [Frequency, ...Frequency[]], {
      message: "Frekuensi tidak dikenal",
    }),
    interval: z.coerce
      .number()
      .int("Interval harus bilangan bulat")
      .min(1, "Interval minimal 1")
      .max(365, "Interval maksimal 365"),
    nextRunDate: tanggalKalender,
    endDate: z
      .union([tanggalKalender, z.literal("").transform(() => null)])
      .nullable(),
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

    if (!data.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Kategori wajib dipilih",
      });
    }
  })
  .refine(
    (data) => !data.endDate || data.endDate.getTime() >= data.nextRunDate.getTime(),
    { path: ["endDate"], message: "Tanggal berakhir harus setelah jadwal berikutnya" },
  );

export type RecurringInput = z.infer<typeof recurringSchema>;

export const recurringIdSchema = z.object({
  id: z.string().min(1, "Aturan tidak ditemukan"),
});

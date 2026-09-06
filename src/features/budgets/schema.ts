import { z } from "zod";
import { nominalPositif } from "@/features/accounts/schema";

/** Periode anggaran berbentuk "YYYY-MM". */
export const periodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode tidak valid");

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  period: periodeSchema,
  amount: nominalPositif,
});

export type BudgetInput = z.infer<typeof budgetSchema>;

export const budgetIdSchema = z.object({
  id: z.string().min(1, "Anggaran tidak dikenal"),
});

export const salinAnggaranSchema = z.object({
  period: periodeSchema,
});

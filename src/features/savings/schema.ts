import { z } from "zod";
import { SAVINGS_STATUSES, type SavingsStatus } from "@/lib/constants";
import { nominalPositif } from "@/features/accounts/schema";
import { tanggalKalender } from "@/features/transactions/schema";

export const savingsGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama target minimal 2 karakter")
    .max(60, "Nama target maksimal 60 karakter"),
  targetAmount: nominalPositif,
  // Kosong berarti tanpa tenggat.
  targetDate: z
    .union([tanggalKalender, z.literal("").transform(() => null)])
    .nullable(),
  accountId: z.string().min(1, "Akun penampung wajib dipilih"),
});

export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;

export const goalIdSchema = z.object({
  id: z.string().min(1, "Target tidak ditemukan"),
});

export const goalStatusSchema = z.object({
  id: z.string().min(1, "Target tidak ditemukan"),
  status: z.enum(
    SAVINGS_STATUSES as unknown as [SavingsStatus, ...SavingsStatus[]],
    { message: "Status tidak dikenal" },
  ),
});

export const contributionSchema = z.object({
  goalId: z.string().min(1, "Target tidak ditemukan"),
  date: tanggalKalender,
  amount: nominalPositif,
  /** Akun sumber dana; berbeda dari akun penampung target. */
  fromAccountId: z.string().min(1, "Akun sumber wajib dipilih"),
  note: z.string().trim().max(200).optional(),
});

export const contributionIdSchema = z.object({
  id: z.string().min(1, "Setoran tidak ditemukan"),
});

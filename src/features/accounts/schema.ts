import { z } from "zod";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/constants";
import { MAX_MONEY, toMoney } from "@/lib/money";

/**
 * Tipe akun yang boleh dipilih pengguna. Portofolio investasi tidak ada di
 * sini karena dibuat otomatis oleh modul Investasi.
 */
export const TIPE_AKUN_PILIHAN = ACCOUNT_TYPES.filter(
  (tipe) => tipe !== "INVESTMENT",
) as readonly AccountType[];

/** Mengubah teks nominal berformat Indonesia menjadi bigint. */
export const nominal = z
  .string()
  .trim()
  .transform((nilai, ctx) => {
    if (nilai === "") return 0n;
    try {
      return toMoney(nilai);
    } catch {
      ctx.addIssue({ code: "custom", message: "Nominal tidak valid" });
      return z.NEVER;
    }
  })
  .refine((nilai) => nilai <= MAX_MONEY, {
    message: "Nominal terlalu besar",
  });

/** Nominal yang wajib lebih dari nol. */
export const nominalPositif = nominal.refine((nilai) => nilai > 0n, {
  message: "Nominal harus lebih dari nol",
});

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama akun minimal 2 karakter")
    .max(60, "Nama akun maksimal 60 karakter"),
  type: z.enum(TIPE_AKUN_PILIHAN as [AccountType, ...AccountType[]], {
    message: "Tipe akun tidak dikenal",
  }),
  openingBalance: nominal,
});

export type AccountInput = z.infer<typeof accountSchema>;

export const accountIdSchema = z.object({
  id: z.string().min(1, "Akun tidak dikenal"),
});

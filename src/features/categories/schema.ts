import { z } from "zod";
import { CATEGORY_KINDS, type CategoryKind } from "@/lib/constants";

/** Warna pilihan untuk penanda kategori. */
export const WARNA_KATEGORI = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#16a34a",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
] as const;

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama kategori minimal 2 karakter")
    .max(40, "Nama kategori maksimal 40 karakter"),
  kind: z.enum(CATEGORY_KINDS as unknown as [CategoryKind, ...CategoryKind[]], {
    message: "Jenis kategori tidak dikenal",
  }),
  // Select mengirim string kosong bila induk tidak dipilih.
  parentId: z
    .string()
    .trim()
    .transform((nilai) => (nilai === "" || nilai === "none" ? null : nilai))
    .nullable(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Warna tidak valid")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const categoryIdSchema = z.object({
  id: z.string().min(1, "Kategori tidak dikenal"),
});

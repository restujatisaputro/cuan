import { z } from "zod";
import { ROLES } from "@/lib/constants";

/** Daftar mata uang yang didukung antarmuka. */
export const CURRENCIES = ["IDR", "USD", "SGD", "MYR", "EUR"] as const;

/** Zona waktu yang relevan untuk pengguna Indonesia. */
export const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "UTC",
] as const;

const email = z
  .string()
  .trim()
  .min(1, "Email wajib diisi")
  .max(255, "Email terlalu panjang")
  .email("Format email tidak valid")
  .toLowerCase();

const password = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter");

const name = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter")
  .max(80, "Nama maksimal 80 karakter");

export const registerSchema = z
  .object({
    name,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak sama",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi").max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const profileSchema = z.object({
  name,
  currency: z.enum(CURRENCIES, { message: "Mata uang tidak dikenal" }),
  timezone: z.enum(TIMEZONES, { message: "Zona waktu tidak dikenal" }),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi").max(72),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak sama",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Password baru harus berbeda dari password saat ini",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const adminCreateUserSchema = z.object({
  name,
  email,
  password,
  role: z.enum(ROLES, { message: "Peran tidak dikenal" }),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const toggleUserActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});

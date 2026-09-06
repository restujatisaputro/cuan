"use server";

import { z } from "zod";
import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getClientIp } from "@/lib/request";
import { pesanRateLimit, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/features/auth/schema";
import { buatPenggunaBaru, EmailSudahDipakaiError } from "@/features/auth/service";
// Semua mutasi memakai Server Action, yang di Next.js hanya menerima POST
// dengan header Origin yang cocok dengan Host — itulah proteksi CSRF-nya.
import type { FormState } from "@/features/auth/form-state";


/** Batas percobaan login: 5 kali per 15 menit, lalu diblokir 15 menit. */
const BATAS_LOGIN = { limit: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 };

/** Batas registrasi: 5 akun baru per jam dari satu alamat IP. */
const BATAS_DAFTAR = { limit: 5, windowMs: 60 * 60_000, blockMs: 60 * 60_000 };

function ambilTujuan(formData: FormData): string {
  const lanjut = formData.get("lanjut");
  // Hanya menerima path internal supaya tidak bisa dipakai sebagai open redirect.
  if (typeof lanjut === "string" && /^\/(?!\/)/.test(lanjut)) return lanjut;
  return "/dasbor";
}

export async function masukAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const emailDiisi = String(formData.get("email") ?? "");
  const hasil = loginSchema.safeParse({
    email: emailDiisi,
    password: formData.get("password"),
  });

  if (!hasil.success) {
    return {
      galatField: z.flattenError(hasil.error).fieldErrors,
      nilai: { email: emailDiisi },
    };
  }

  const ip = await getClientIp();
  const kunci = `masuk:${ip}:${hasil.data.email}`;
  const batas = rateLimit({ key: kunci, ...BATAS_LOGIN });
  if (!batas.ok) {
    return { pesan: pesanRateLimit(batas.tungguDetik), nilai: { email: emailDiisi } };
  }

  try {
    await signIn("credentials", {
      email: hasil.data.email,
      password: hasil.data.password,
      redirectTo: ambilTujuan(formData),
    });
  } catch (error) {
    // Auth.js membungkus galat dari authorize() menjadi CredentialsSignin
    // dengan properti `code` sesuai kelas galat yang dilempar.
    if (error instanceof CredentialsSignin) {
      if (error.code === "akun_nonaktif") {
        return {
          pesan: "Akun ini dinonaktifkan. Hubungi administrator.",
          nilai: { email: emailDiisi },
        };
      }
      return { pesan: "Email atau password salah.", nilai: { email: emailDiisi } };
    }
    if (error instanceof AuthError) {
      console.error("Galat autentikasi:", error);
      return { pesan: "Terjadi kesalahan saat masuk. Coba lagi." };
    }
    // Pengalihan setelah login sukses dilempar sebagai error oleh Next.js.
    throw error;
  }

  resetRateLimit(kunci);
  return {};
}

export async function daftarAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const isian = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const hasil = registerSchema.safeParse({
    ...isian,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, nilai: isian };
  }

  const ip = await getClientIp();
  const kunci = `daftar:${ip}`;
  const batas = rateLimit({ key: kunci, ...BATAS_DAFTAR });
  if (!batas.ok) {
    return { pesan: pesanRateLimit(batas.tungguDetik) };
  }

  try {
    await buatPenggunaBaru({
      name: hasil.data.name,
      email: hasil.data.email,
      password: hasil.data.password,
    });
  } catch (error) {
    if (error instanceof EmailSudahDipakaiError) {
      return { galatField: { email: ["Email sudah terdaftar"] }, nilai: isian };
    }
    console.error("Gagal membuat pengguna:", error);
    return { pesan: "Terjadi kesalahan saat membuat akun. Coba lagi.", nilai: isian };
  }

  try {
    await signIn("credentials", {
      email: hasil.data.email,
      password: hasil.data.password,
      redirectTo: "/dasbor",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { pesan: "Akun berhasil dibuat. Silakan masuk." };
    }
    throw error;
  }

  return {};
}

export async function keluarAction(): Promise<void> {
  await signOut({ redirectTo: "/masuk" });
}

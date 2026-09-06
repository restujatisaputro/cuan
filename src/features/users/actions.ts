"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wajibAdmin, ambilPenggunaAtauGagal } from "@/lib/session";
import {
  adminCreateUserSchema,
  changePasswordSchema,
  profileSchema,
  toggleUserActiveSchema,
} from "@/features/auth/schema";
import {
  buatPenggunaBaru,
  EmailSudahDipakaiError,
  hashPassword,
  verifyPassword,
} from "@/features/auth/service";
import type { FormState } from "@/features/auth/form-state";

const GAGAL_SESI: FormState = {
  pesan: "Sesi berakhir. Muat ulang halaman lalu masuk kembali.",
};

export async function perbaruiProfilAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return GAGAL_SESI;

  const hasil = profileSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency"),
    timezone: formData.get("timezone"),
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors };
  }

  await prisma.user.update({
    where: { id: pengguna.id },
    data: {
      name: hasil.data.name,
      currency: hasil.data.currency,
      timezone: hasil.data.timezone,
    },
  });

  revalidatePath("/profil");
  revalidatePath("/", "layout");
  return { pesan: "Profil berhasil diperbarui." };
}

export async function gantiPasswordAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return GAGAL_SESI;

  const hasil = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors };
  }

  const tersimpan = await prisma.user.findUnique({
    where: { id: pengguna.id },
    select: { passwordHash: true },
  });

  const cocok = await verifyPassword(
    hasil.data.currentPassword,
    tersimpan?.passwordHash,
  );
  if (!cocok) {
    return { galatField: { currentPassword: ["Password saat ini salah"] } };
  }

  await prisma.user.update({
    where: { id: pengguna.id },
    data: { passwordHash: await hashPassword(hasil.data.newPassword) },
  });

  return { pesan: "Password berhasil diganti." };
}

export async function adminBuatPenggunaAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await wajibAdmin();

  const hasil = adminCreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors };
  }

  try {
    await buatPenggunaBaru(hasil.data);
  } catch (error) {
    if (error instanceof EmailSudahDipakaiError) {
      return { galatField: { email: ["Email sudah terdaftar"] } };
    }
    console.error("Gagal membuat pengguna:", error);
    return { pesan: "Terjadi kesalahan saat membuat pengguna." };
  }

  revalidatePath("/admin/pengguna");
  return { pesan: `Pengguna ${hasil.data.name} berhasil dibuat.` };
}

export async function adminUbahStatusAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await wajibAdmin();

  const hasil = toggleUserActiveSchema.safeParse({
    userId: formData.get("userId"),
    isActive: formData.get("isActive") === "true",
  });

  if (!hasil.success) {
    return { pesan: "Permintaan tidak valid." };
  }

  if (hasil.data.userId === admin.id) {
    return { pesan: "Anda tidak dapat menonaktifkan akun sendiri." };
  }

  const target = await prisma.user.findUnique({
    where: { id: hasil.data.userId },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!target) return { pesan: "Pengguna tidak ditemukan." };

  // Jangan sampai tidak ada satu pun admin aktif yang tersisa.
  if (!hasil.data.isActive && target.role === "ADMIN") {
    const adminAktif = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });
    if (adminAktif <= 1) {
      return { pesan: "Minimal harus ada satu administrator yang aktif." };
    }
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { isActive: hasil.data.isActive },
  });

  revalidatePath("/admin/pengguna");
  return {
    pesan: hasil.data.isActive
      ? `${target.name} diaktifkan kembali.`
      : `${target.name} dinonaktifkan.`,
  };
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ambilPenggunaAtauGagal } from "@/lib/session";
import { galat, sukses, type FormState } from "@/features/auth/form-state";
import {
  categoryIdSchema,
  categorySchema,
} from "@/features/categories/schema";

const SESI_HABIS = galat("Sesi berakhir. Muat ulang halaman lalu masuk kembali.");

function segarkan(): void {
  revalidatePath("/kategori");
  revalidatePath("/transaksi");
  revalidatePath("/dasbor");
}

export async function simpanKategoriAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const id = formData.get("id");
  const idLama = typeof id === "string" && id ? id : null;

  const hasil = categorySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    parentId: formData.get("parentId") ?? "",
    color: formData.get("color") ?? "",
  });

  if (!hasil.success) {
    return { galatField: z.flattenError(hasil.error).fieldErrors, gagal: true };
  }

  const { name, kind, parentId, color } = hasil.data;

  if (parentId) {
    if (parentId === idLama) {
      return galat("Kategori tidak bisa menjadi induk dirinya sendiri.");
    }
    const induk = await prisma.category.findFirst({
      where: { id: parentId, userId: pengguna.id },
      select: { id: true, kind: true, parentId: true },
    });
    if (!induk) return galat("Kategori induk tidak ditemukan.");
    if (induk.kind !== kind) {
      return galat("Kategori induk harus berjenis sama.");
    }
    // Struktur dibatasi dua tingkat supaya laporan tetap sederhana.
    if (induk.parentId) {
      return galat("Sub-kategori tidak bisa punya sub-kategori lagi.");
    }
  }

  const bentrok = await prisma.category.findFirst({
    where: {
      userId: pengguna.id,
      kind,
      parentId,
      name,
      ...(idLama ? { NOT: { id: idLama } } : {}),
    },
    select: { id: true },
  });
  if (bentrok) {
    return {
      galatField: { name: ["Sudah ada kategori dengan nama ini"] },
      gagal: true,
    };
  }

  if (idLama) {
    const lama = await prisma.category.findFirst({
      where: { id: idLama, userId: pengguna.id },
      select: { id: true, kind: true, _count: { select: { children: true } } },
    });
    if (!lama) return galat("Kategori tidak ditemukan.");

    if (lama._count.children > 0 && parentId) {
      return galat(
        "Kategori ini punya sub-kategori, jadi tidak bisa dijadikan sub-kategori.",
      );
    }
    if (lama.kind !== kind && lama._count.children > 0) {
      return galat("Ubah jenis sub-kategorinya lebih dulu.");
    }

    await prisma.category.update({
      where: { id: idLama },
      data: { name, kind, parentId, color: color ?? null },
    });
    segarkan();
    return sukses(`Kategori ${name} diperbarui.`);
  }

  await prisma.category.create({
    data: { userId: pengguna.id, name, kind, parentId, color: color ?? null },
  });
  segarkan();
  return sukses(`Kategori ${name} ditambahkan.`);
}

export async function hapusKategoriAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const pengguna = await ambilPenggunaAtauGagal();
  if (!pengguna) return SESI_HABIS;

  const hasil = categoryIdSchema.safeParse({ id: formData.get("id") });
  if (!hasil.success) return galat("Permintaan tidak valid.");

  const kategori = await prisma.category.findFirst({
    where: { id: hasil.data.id, userId: pengguna.id },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          children: true,
          transactions: true,
          budgets: true,
          recurringRules: true,
        },
      },
    },
  });
  if (!kategori) return galat("Kategori tidak ditemukan.");

  const { children, transactions, budgets, recurringRules } = kategori._count;

  if (children > 0) {
    return galat(
      `Kategori ${kategori.name} masih punya ${children} sub-kategori. Hapus sub-kategorinya lebih dulu.`,
    );
  }
  // Menolak penghapusan lebih aman daripada membiarkan transaksi kehilangan
  // kategorinya (relasi memakai onDelete: SetNull).
  if (transactions > 0) {
    return galat(
      `Kategori ${kategori.name} dipakai ${transactions} transaksi. Ubah kategori transaksi itu lebih dulu.`,
    );
  }
  if (budgets > 0 || recurringRules > 0) {
    return galat(
      `Kategori ${kategori.name} masih dipakai anggaran atau transaksi berulang.`,
    );
  }

  await prisma.category.delete({ where: { id: kategori.id } });
  segarkan();
  return sukses(`Kategori ${kategori.name} dihapus.`);
}
